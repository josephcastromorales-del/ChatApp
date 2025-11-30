// Cambia la URL si tu pocketbase corre en otra parte
const PB_URL = "http://192.168.1.15:8090";
const pb = new PocketBase(PB_URL);

// Helper: get current user model
function getCurrentUser(){
  return pb.authStore.model; // null si no hay sesión
}

// Redirect to login if not authenticated (util)
function requireAuth(redirectTo = "index.html"){
  if(!pb.authStore.isValid) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}


