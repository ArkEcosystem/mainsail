use std::sync::mpsc::Sender;

#[derive(Default, Clone)]
pub struct Logger {
    // A channel is optional and if not present, log output is written via println!
    sender: Option<Sender<(LogLevel, String)>>,
}

impl Logger {
    pub fn new(sender: Option<Sender<(LogLevel, String)>>) -> Self {
        Self { sender }
    }

    pub fn log(&self, level: LogLevel, message: String) {
        match &self.sender {
            Some(sender) => {
                if let Err(err) = sender.send((level, message)) {
                    eprintln!("failed to send log message: {}", err);
                }
            }
            None => {
                println!("[{level}]: {message}");
            }
        }
    }
}

#[derive(PartialEq, Eq)]
pub enum LogLevel {
    Info,
    Debug,
    Notice,
    Emergency,
    Alert,
    Critical,
    Warning,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let uppercase = match self {
            LogLevel::Info => "INFO",
            LogLevel::Debug => "DEBUG",
            LogLevel::Notice => "NOTICE",
            LogLevel::Emergency => "EMERGENCY",
            LogLevel::Alert => "ALERT",
            LogLevel::Critical => "CRITICAL",
            LogLevel::Warning => "WARNING",
        };
        write!(f, "{}", uppercase)
    }
}
