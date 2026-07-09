use std::sync::mpsc::Sender;

pub enum LoggerCommand {
    Log(LogLevel, String),
    Shutdown,
}

#[derive(Default, Clone)]
pub struct Logger {
    // A channel is optional and if not present, log output is written via println!
    pub sender: Option<Sender<LoggerCommand>>,
}

impl Logger {
    pub fn new(sender: Option<Sender<LoggerCommand>>) -> Self {
        Self { sender }
    }

    pub fn log(&self, level: LogLevel, message: String) {
        match &self.sender {
            Some(sender) => {
                if let Err(err) = sender.send(LoggerCommand::Log(level, message)) {
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
    Alert,
    Warn,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let uppercase = match self {
            LogLevel::Info => "INFO",
            LogLevel::Debug => "DEBUG",
            LogLevel::Notice => "NOTICE",
            LogLevel::Alert => "ALERT",
            LogLevel::Warn => "WARN",
        };
        write!(f, "{}", uppercase)
    }
}

#[cfg(test)]
mod tests {
    use std::{sync::mpsc::channel, time::Duration};

    use crate::logger::{LogLevel, Logger, LoggerCommand};

    #[test]
    fn test_logger_sends_log_message_through_channel() {
        let (tx, rx) = channel();
        let logger = Logger::new(Some(tx));

        logger.log(LogLevel::Info, "hello world".to_string());

        match rx.recv_timeout(Duration::from_millis(100)).unwrap() {
            LoggerCommand::Log(level, message) => {
                assert_eq!(level.to_string(), "INFO");
                assert_eq!(message, "hello world");
            }
            LoggerCommand::Shutdown => panic!("expected a log entry"),
        }
    }

    #[test]
    fn test_logger_without_sender_does_not_panic() {
        let logger = Logger::new(None);

        logger.log(LogLevel::Warn, "printed to stdout".to_string());
    }

    #[test]
    fn test_logger_with_disconnected_channel_does_not_panic() {
        let (tx, rx) = channel();
        drop(rx);

        let logger = Logger::new(Some(tx));
        logger.log(LogLevel::Alert, "this will fail to send".to_string());
    }

    #[test]
    fn test_log_level_display_format() {
        let cases = [
            (LogLevel::Info, "INFO"),
            (LogLevel::Debug, "DEBUG"),
            (LogLevel::Notice, "NOTICE"),
            (LogLevel::Alert, "ALERT"),
            (LogLevel::Warn, "WARN"),
        ];

        for (level, expected) in cases {
            assert_eq!(level.to_string(), expected);
        }
    }
}
