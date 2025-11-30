const pb = new PocketBase("http://192.168.1.15:8090");

document.getElementById("login-btn").addEventListener("click", login);

async function login() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const auth = await pb.collection('users').authWithPassword(email, password);
        console.log(auth);
        alert("Inicio de sesión exitoso.");
        window.location.href = "chat.html";
    } catch (err) {
        console.log(err);
        alert("Error al iniciar sesión:\n" + err.message);
    }
}