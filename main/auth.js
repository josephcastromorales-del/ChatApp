// signIn(email,password)
async function signIn(email, password){
  if(!email || !password) return { ok:false, message: 'Completa email y contraseña' };
  try{
    await pb.collection('users').authWithPassword(email, password);
    // pb.authStore.save() happens automatically
    return { ok:true };
  }catch(e){
    // e.message es legible
    return { ok:false, message: e.message || 'Failed to authenticate' };
  }
}

// registerUser(username,email,password,passwordConfirm)
async function registerUser(username,email,password,passwordConfirm){
  if(!username || !email || !password || !passwordConfirm) return { ok:false, message: 'Completa todos los campos' };
  if(password.length < 8) return { ok:false, message: 'La contraseña debe tener al menos 8 caracteres' };
  if(password !== passwordConfirm) return { ok:false, message: 'Las contraseñas no coinciden' };

  try{
    // crea cuenta en collection auth "users"
    await pb.collection('users').create({
      username,
      email,
      password,
      passwordConfirm
    });
    // iniciar sesión automáticamente
    await pb.collection('users').authWithPassword(email, password);
    return { ok:true };
  }catch(e){
    return { ok:false, message: e.message || 'Error al registrar' };
  }
}
