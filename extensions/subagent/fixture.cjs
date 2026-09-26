// Offline Pi JSON event fixture. Never invokes Pi or a model.
const task = process.argv.at(-1).replace(/^Task: /, '');
const send = event => process.stdout.write(JSON.stringify(event) + '\n');
const assistant = text => ({ role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop', usage: { input: 'bad', cost: { total: 'bad' } } });
if (task === 'small-exact') {
 send({ type: 'message_end', message: assistant('  exact $& 😀\nsecond line\n') });
} else if (task === 'medium-exact') {
 send({ type: 'message_end', message: assistant('m'.repeat(20000) + '\nTHE END') });
} else if (task === 'large-text') {
 send({ type: 'message_end', message: assistant('L'.repeat(1200000) + '\nFULL END') });
} else if (task.startsWith('echo:')) {
 send({ type: 'message_end', message: assistant(task.slice(5)) });
} else if (task === 'fail') {
 send({ type: 'message_end', message: { ...assistant('failure'), stopReason: 'error', errorMessage: 'fixture failure' } });
} else {
 process.stdout.write('null\n[]\ninvalid\n{"type":"message_end","message":null}\n');
 const messages = [];
 for (let i = 0; i < 12; i++) {
  const tool = { role: 'toolResult', toolCallId: String(i), toolName: 'read', content: [{ type: 'image', mimeType: 'image/png', data: 'a'.repeat(2 * 1024 * 1024) }], isError: false };
  messages.push(tool);
  send({ type: 'message_end', message: tool });
  const message = assistant('hello 😀 ' + 'x'.repeat(35000));
  messages.push(message);
  send({ type: 'message_end', message });
 }
 // Real Pi repeats all messages, including images, in agent_end.
 send({ type: 'agent_end', messages });
 process.stderr.write('diagnostic '.repeat(2000));
}
