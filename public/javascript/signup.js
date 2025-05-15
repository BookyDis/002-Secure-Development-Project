let currentUser = '';
let csrfToken = '';

//fetch csrf token on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/csrf-token');
        const data = await res.json();
        csrfToken = data.csrfToken;
    } catch (err) {
        alert('Failed to fetch CSRF token');
        console.error(err);
    }
});

// Step 1: Sign up and get QR code
async function signup(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Password regex ofminimum 8 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        alert('Password must be at least 8 characters long and contain at least one letter and one number.');
        return;
    }

    const res = await fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            //send csrf token along with the header
            'x-csrf-token': csrfToken
        },
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
        headers: {
            'Content-Type': 'application/json',
            //send csrf token along with the header
            'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ username: currentUser, token })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        window.location.href = '/login';
    }
}