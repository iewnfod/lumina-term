use std::{
    collections::HashMap,
    io::Write,
    sync::{Arc, Mutex},
};

use portable_pty::{Child, PtyPair};

pub type CommandChild = Box<dyn Child + Send + Sync>;
pub type SharedChild = Arc<Mutex<CommandChild>>;
type TerminalWriter = Box<dyn Write + Send>;

#[derive(Default, Clone)]
pub struct TerminalState {
    pub terminals: Arc<Mutex<HashMap<String, (PtyPair, SharedChild, TerminalWriter)>>>,
}
