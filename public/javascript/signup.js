let currentUser = '';

// Step 1: Sign up and get QR code
async function signup(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    currentUser = username;

    const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    alert(data.message || 'Scan the QR code and continue');

    if (res.ok && data.qrCode) {
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
        document.getElementById('qrContainer').innerHTML = `<img src="${data.qrCode}" />`;
    }
}

// Step 2: Submit token to complete MFA setup
async function verifySignup(event) {
    event.preventDefault();

    const token = document.getElementById('token').value;

    const res = await fetch('/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, token })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        window.location.href = '/login';
    }
}
