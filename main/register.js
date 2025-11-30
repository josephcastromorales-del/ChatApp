const pb = new PocketBase("http://192.168.1.15:8090");

document.getElementById("register-btn").addEventListener("click", register);

async function register() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    try {
        await pb.collection('users').create({
            username: username,
            email: email,
            password: password,
            passwordConfirm: password
        });

        alert("Cuenta creada correctamente");
        window.location.href = "index.html";

    } catch (error) {
        alert("Error al registrarse: " + error.message);
    }
}
