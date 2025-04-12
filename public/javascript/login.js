let currentUser = '';

// Step 1: Submit username and password
async function loginStep1(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    currentUser = username;

    const res = await fetch('/login-step-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
    }
}

// Step 2: Submit MFA tokens
async function verifyMFA(event) {
    event.preventDefault();
    const token = document.getElementById('token').value;

    const res = await fetch('/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, token })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        window.location.href = '/dashboard';
    }
}
