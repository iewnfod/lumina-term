use std::{
    collections::HashMap,
    io::Write,
    sync::{Arc, Mutex},
};

use portable_pty::{Child, PtyPair};

type CommandChild = Box<dyn Child + Send + Sync>;
type TerminalWriter = Box<dyn Write + Send>;

#[derive(Default)]
pub struct TerminalState {
    pub terminals: Arc<Mutex<HashMap<String, (PtyPair, CommandChild, TerminalWriter)>>>,
}
