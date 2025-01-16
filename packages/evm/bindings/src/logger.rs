use mainsail_evm_core::logger::{LogLevel, Logger};
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread::{self, JoinHandle};

#[napi(js_name = "LogLevel")]
pub enum JsLogLevel {
    Info,
    Debug,
    Notice,
    Emergency,
    Alert,
    Critical,
    Warning,
}

pub struct JsLogger {
    internal_logger: Logger,
    tsfn: Option<(
        ThreadsafeFunction<(u32, String), ErrorStrategy::Fatal>,
        (Sender<(LogLevel, String)>, JoinHandle<()>),
    )>,
}

impl JsLogger {
    const DROP_MESSAGE: &'static str = "DROP";

    pub fn new(logger_callback: Option<JsFunction>) -> Result<Self> {
        let mut logger_sender: Option<Sender<(LogLevel, String)>> = None;
        let mut logger_fn: Option<(
            ThreadsafeFunction<(u32, String), ErrorStrategy::Fatal>,
            (Sender<(LogLevel, String)>, JoinHandle<()>),
        )> = None;

        if let Some(logger_callback) = logger_callback {
            let (sender, receiver): (Sender<(LogLevel, String)>, Receiver<(LogLevel, String)>) =
                channel();

            let tsfn: ThreadsafeFunction<(u32, String), ErrorStrategy::Fatal> = logger_callback
                .create_threadsafe_function(0, |ctx| {
                    let (level, message) = ctx.value;
                    let js_level = ctx.env.create_uint32(level)?;
                    let js_message = ctx.env.create_string_from_std(message)?;
                    Ok(vec![js_level.into_unknown(), js_message.into_unknown()])
                })
                .expect("init logger thread function");

            // Spawn a thread to listen for log messages and invoke the JS callback
            let handle = thread::spawn({
                let tsfn = tsfn.clone();
                move || {
                    for (level, message) in receiver {
                        if level == LogLevel::Notice && message == Self::DROP_MESSAGE {
                            break;
                        }

                        tsfn.call(
                            (level as u32, message),
                            ThreadsafeFunctionCallMode::NonBlocking,
                        );
                    }
                    tsfn.abort().expect("failed aborting threadsafe function");
                    ()
                }
            });

            logger_sender.replace(sender.clone());
            logger_fn.replace((tsfn, (sender, handle)));
        }

        let internal_logger = Logger::new(logger_sender);

        Ok(Self {
            internal_logger,
            tsfn: logger_fn,
        })
    }

    pub fn inner(&self) -> Logger {
        self.internal_logger.clone()
    }

    pub fn log(&self, level: LogLevel, message: String) {
        self.internal_logger.log(level, message);
    }
}

impl Drop for JsLogger {
    fn drop(&mut self) {
        if let Some((_, (sender, handle))) = self.tsfn.take() {
            let _ = sender.send((LogLevel::Notice, Self::DROP_MESSAGE.into()));
            handle.join().expect("failed to join logger thread");
        }
    }
}
