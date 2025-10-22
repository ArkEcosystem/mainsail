use mainsail_evm_core::logger::{LogLevel, Logger};
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeCallContext, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::sync::mpsc::{Receiver, Sender, channel};
use std::thread::{self, JoinHandle};

#[napi(js_name = "LogLevel")]
pub enum JsLogLevel {
    Info,
    Debug,
    Notice,
    Alert,
    Warn,
}

impl From<LogLevel> for JsLogLevel {
    fn from(value: LogLevel) -> Self {
        match value {
            LogLevel::Info => Self::Info,
            LogLevel::Debug => Self::Debug,
            LogLevel::Notice => Self::Notice,
            LogLevel::Alert => Self::Alert,
            LogLevel::Warn => Self::Warn,
        }
    }
}

#[napi(object)]
pub struct JsLogMessage {
    pub level: JsLogLevel,
    pub message: String,
}

pub struct JsLogger {
    internal_logger: Logger,
    logger_handle: Option<JoinHandle<()>>,
}

impl JsLogger {
    const DROP_MESSAGE: &'static str = "DROP";

    pub fn new(logger_callback: Option<Function<'static, JsLogMessage, ()>>) -> Result<Self> {
        let mut logger_sender: Option<Sender<(LogLevel, String)>> = None;
        let mut logger_handle: Option<JoinHandle<()>> = None;

        if let Some(logger_callback) = logger_callback {
            let (sender, receiver): (Sender<(LogLevel, String)>, Receiver<(LogLevel, String)>) =
                channel();

            let tsfn = logger_callback.build_threadsafe_function().build_callback(
                |ctx: ThreadsafeCallContext<JsLogMessage>| -> Result<JsLogMessage> {
                    Ok(ctx.value)
                },
            )?;

            // Spawn a thread to listen for log messages and invoke the JS callback
            let handle = thread::spawn({
                //   let tsfn = tsfn.clone();
                move || {
                    for (level, message) in receiver {
                        if level == LogLevel::Notice && message == Self::DROP_MESSAGE {
                            break;
                        }

                        tsfn.call(
                            JsLogMessage {
                                level: level.into(),
                                message,
                            },
                            ThreadsafeFunctionCallMode::NonBlocking,
                        );
                    }

                    ()
                }
            });

            logger_sender.replace(sender.clone());
            logger_handle.replace(handle);
        }

        let internal_logger = Logger::new(logger_sender);

        Ok(Self {
            internal_logger,
            logger_handle,
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
        if let Some(handle) = self.logger_handle.take() {
            if let Some(sender) = self.internal_logger.sender.as_ref() {
                let _ = sender.send((LogLevel::Notice, Self::DROP_MESSAGE.into()));
            }

            handle.join().expect("failed to join logger thread");
        }
    }
}
