// obligar auth (si no, va a index)
if(!requireAuth()){
  // requireAuth redirects if not auth
  throw new Error('No autorizado');
}

const me = getCurrentUser();
document.getElementById('meName').innerText = me?.username || me?.email || 'Tú';

// elements
const usersListEl = document.getElementById('usersList');
const messagesEl = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatHeader = document.getElementById('chatHeader');
const tabGroup = document.getElementById('tab-group');
const tabPrivate = document.getElementById('tab-private');
const logoutBtn = document.getElementById('logoutBtn');

let mode = 'group'; // 'group' o 'private'
let selectedUserId = null; // para modo privado

const GROUP_COLLECTION = 'messages_group';
const PRIVATE_COLLECTION = 'messages_private';

// LOGOUT
logoutBtn.addEventListener('click', ()=>{
  pb.authStore.clear();
  window.location.href = 'index.html';
});

// Tabs
tabGroup.addEventListener('click', ()=> { setMode('group'); });
tabPrivate.addEventListener('click', ()=> { setMode('private'); });

function setMode(m){
  mode = m;
  // UI
  if(mode === 'group'){
    tabGroup.classList.add('active');
    tabPrivate.classList.remove('active');
    chatHeader.innerText = 'Chat grupal';
    selectedUserId = null;
    // loadGroupMessages();  poner bien otra vez si no funciona //
  } else {
    tabPrivate.classList.add('active');
    tabGroup.classList.remove('active');
    chatHeader.innerText = selectedUserId ? `Privado con ${getUserNameById(selectedUserId)}` : 'Selecciona un usuario';
    // no cargar nada si no hay usuario seleccionado
    if(selectedUserId); // loadPrivateMessages(selectedUserId); poner bien otra vez si no funciona//
  }
}

// Cargar usuarios
async function loadUsers(){
  try{
    // Trae todos los usuarios (filtra el mismo)
    // Trae todos los usuarios online (excepto tú)





    const users = await pb.collection('users').getFullList({
    filter: 'isOnline=true',
    sort: 'username'
    });




    pb.collection('users').subscribe('*', async (e)=>{
    await loadUsers(); // recarga lista online
    });







    usersListEl.innerHTML = '';
    users.forEach(u => {
      if(u.id === me.id) return; // no listarse a sí mismo
      const li = document.createElement('div');
      li.className = 'user-item';
      li.dataset.id = u.id;
      li.innerHTML = `
        <div class="left">
          <div class="avatar"></div>
          <div>
            <div class="name">${u.username || u.email}</div>
            <div class="meta">${u.email || ''}</div>
          </div>
        </div>
        <div class="right">
          <small class="meta">></small>
        </div>
      `;
      li.addEventListener('click', ()=> {
        // seleccionar usuario (modo privado) y cargar mensajes
        selectedUserId = u.id;
        chatHeader.innerText = `Privado con ${u.username || u.email}`;
        setMode('private');
        loadPrivateMessages(u.id);
      });
      usersListEl.appendChild(li);
    });
  }catch(e){
    console.error('Error cargando usuarios', e);
  }
}

// utilidad para mostrar nombre localmente (puede ser pequeña cache)
let usersCache = {};
async function ensureUsersCache(){
  try{
    const list = await pb.collection('users').getFullList();
    list.forEach(u => usersCache[u.id] = (u.username || u.email));
  }catch(e){ console.warn('no pudo cargar users cache', e); }
}
function getUserNameById(id){ return usersCache[id] || id; }

// ---------- Mensajes grupales ----------
async function loadGroupMessages(){
  try{
    messagesEl.innerHTML = '';
    const msgs = await pb.collection(GROUP_COLLECTION).getFullList({ sort: 'created' });
    msgs.forEach(m => appendMsgToDom(m, GROUP_COLLECTION));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }catch(e){
    console.error('Error cargando mensajes grupales', e);
  }
}

// ---------- Mensajes privados ----------
async function loadPrivateMessages(otherId){
  try{
    messagesEl.innerHTML = '';
    // filter: (from = me AND to = other) OR (from = other AND to = me)
    const filter = `(from = "${me.id}" && to = "${otherId}") || (from = "${otherId}" && to = "${me.id}")`;
    const msgs = await pb.collection(PRIVATE_COLLECTION).getFullList({ filter: filter, sort: 'created' });
    msgs.forEach(m => appendMsgToDom(m, PRIVATE_COLLECTION));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }catch(e){
    console.error('Error cargando mensajes privados', e);
  }
}

// Append message generic
function appendMsgToDom(m, collection){
  // m: record
  const div = document.createElement('div');
  div.classList.add('message');
  const isMine = (m.from === me.id);
  div.classList.add(isMine ? 'me' : 'other');
  // show sender for group messages
  if(collection === GROUP_COLLECTION && !isMine){
    const who = getUserNameById(m.from) || m.from;
    const sender = document.createElement('div');
    sender.style.fontSize = '12px';
    sender.style.opacity = '0.9';
    sender.style.marginBottom = '6px';
    sender.style.color = '#cbd5ff';
    sender.innerText = who;
    div.appendChild(sender);
  }
  const text = document.createElement('div');
  text.innerText = m.text;
  div.appendChild(text);
  messagesEl.appendChild(div);
}

// Enviar mensaje (decide target por mode)
async function sendMessage(){
  const text = messageInput.value.trim();
  if(!text) return;
  try{
    if(mode === 'group'){
      await pb.collection(GROUP_COLLECTION).create({
        text: text,
        from: me.id,
        created: new Date().toISOString()
      });
      messageInput.value = '';
      // loadGroupMessages(); realtime subscription will update
    } else {
      if(!selectedUserId){ alert('Selecciona un usuario para chatear en privado'); return; }
      await pb.collection(PRIVATE_COLLECTION).create({
        text: text,
        from: me.id,
        to: selectedUserId,
        created: new Date().toISOString()
      });
      messageInput.value = '';
      // loadPrivateMessages(selectedUserId);
    }
  }catch(e){
    // permiso o regla bloqueando (403) -> revisa reglas en PB
    console.error('Error al enviar mensaje:', e);
    alert('Error al enviar mensaje: ' + (e.message || e));
  }
}

// eventos UI
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') sendMessage(); });

// realtime subscriptions
pb.collection(GROUP_COLLECTION).subscribe('*', (e)=>{
  // si estamos en modo group, refrescar o agregar
  if(mode === 'group'){
    if(e.action === 'create') appendMsgToDom(e.record, GROUP_COLLECTION);
    // scroll
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
});
pb.collection(PRIVATE_COLLECTION).subscribe('*', (e)=>{
  // si modo privado y el mensaje involucra a mi o seleccionado, refrescar
  if(mode === 'private'){
    const r = e.record;
    if(!r) return;
    const involves = (r.from === me.id && r.to === selectedUserId) || (r.from === selectedUserId && r.to === me.id);
    if(involves && e.action === 'create'){
      appendMsgToDom(r, PRIVATE_COLLECTION);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
});

// init: cargar usuarios y mensajes grupales y cache
(async ()=>{
  await ensureUsersCache();
  await loadUsers();
  setMode('group');
})();


// Suscripción realtime para mensajes grupales
pb.collection(GROUP_COLLECTION).subscribe('*', (e)=>{
  if(e.action === 'create'){
    appendMsgToDom(e.record, GROUP_COLLECTION);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
});

// Suscripción realtime para mensajes privados
pb.collection(PRIVATE_COLLECTION).subscribe('*', (e)=>{
  const r = e.record;
  if(!r) return;

  // Se muestra si el mensaje involucra al usuario actual
  if(r.from === me.id || r.to === me.id){
    // Si estás en privado con esa persona, lo agregas al chat
    if(mode === 'private' && (r.from === selectedUserId || r.to === selectedUserId)){
      appendMsgToDom(r, PRIVATE_COLLECTION);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
});



function setMode(m){
  mode = m;

  if(mode === 'group'){
    tabGroup.classList.add('active');
    tabPrivate.classList.remove('active');
    chatHeader.innerText = 'Chat grupal';
    selectedUserId = null;
    loadGroupMessages();
  } else {
    tabPrivate.classList.add('active');
    tabGroup.classList.remove('active');
    // mostrar header
    chatHeader.innerText = selectedUserId ? `Privado con ${getUserNameById(selectedUserId)}` : 'Selecciona un usuario';
    
    // mostrar lista de usuarios en privado
    loadUsers();

    // si ya hay un usuario seleccionado, cargar mensajes
    if(selectedUserId) loadPrivateMessages(selectedUserId);
    else messagesEl.innerHTML = ''; // limpiar chat si no hay usuario seleccionado
  }
}

let displayedMessages = new Set();

function appendMsgToDom(m, collection){
  if(displayedMessages.has(m.id)) return; // si ya está, no agregar
  displayedMessages.add(m.id);

  const div = document.createElement('div');
  div.classList.add('message');
  const isMine = (m.from === me.id);
  div.classList.add(isMine ? 'me' : 'other');

  // mostrar remitente para mensajes grupales
  if(collection === GROUP_COLLECTION && !isMine){
    const who = getUserNameById(m.from) || m.from;
    const sender = document.createElement('div');
    sender.style.fontSize = '12px';
    sender.style.opacity = '0.9';
    sender.style.marginBottom = '6px';
    sender.style.color = '#cbd5ff';
    sender.innerText = who;
    div.appendChild(sender);
  }

  const text = document.createElement('div');
  text.innerText = m.text;
  div.appendChild(text);
  messagesEl.appendChild(div);

  messagesEl.scrollTop = messagesEl.scrollHeight;
}


async function loadGroupMessages(){
  try{
    messagesEl.innerHTML = '';
    displayedMessages.clear(); // limpiar para evitar duplicados
    const msgs = await pb.collection(GROUP_COLLECTION).getFullList({ sort: 'created' });
    msgs.forEach(m => appendMsgToDom(m, GROUP_COLLECTION));
  }catch(e){
    console.error('Error cargando mensajes grupales', e);
  }
}

async function loadPrivateMessages(otherId){
  try{
    messagesEl.innerHTML = '';
    displayedMessages.clear(); // limpiar para evitar duplicados
    const filter = `(from = "${me.id}" && to = "${otherId}") || (from = "${otherId}" && to = "${me.id}")`;
    const msgs = await pb.collection(PRIVATE_COLLECTION).getFullList({ filter: filter, sort: 'created' });
    msgs.forEach(m => appendMsgToDom(m, PRIVATE_COLLECTION));
  }catch(e){
    console.error('Error cargando mensajes privados', e);
  }
}


(async () => {
  await ensureUsersCache();  // primero cargamos la cache con emails
  await loadUsers();         // luego la lista de usuarios
  setMode('group');          // finalmente cargamos los mensajes
})();


function appendMsgToDom(m, collection){
  if(displayedMessages.has(m.id)) return;
  displayedMessages.add(m.id);

  const div = document.createElement('div');
  div.classList.add('message');

  const isMine = (m.from === me.id);
  div.classList.add(isMine ? 'me' : 'other');

  // obtener email del remitente desde la cache
  let who = isMine ? 'Tú' : (usersCache[m.from] || 'Usuario');

  if(!isMine || collection === GROUP_COLLECTION){
    const sender = document.createElement('div');
    sender.style.fontSize = '12px';
    sender.style.opacity = '0.9';
    sender.style.marginBottom = '6px';
    sender.style.color = '#000000a8';
    sender.innerText = who;
    div.appendChild(sender);
  }

  const text = document.createElement('div');
  text.innerText = m.text;
  div.appendChild(text);

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}












async function markOnline(){
  await pb.collection('users').update(me.id, { isOnline: true });
}
markOnline();


logoutBtn.addEventListener('click', async ()=>{
  await pb.collection('users').update(me.id, { isOnline: false });
  pb.authStore.clear();
  window.location.href='index.html';
});
