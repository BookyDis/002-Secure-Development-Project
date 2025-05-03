let currentUser = '';
let csrfToken = '';

async function fetchCsrfToken() {
    try {
        const response = await fetch('/csrf-token');
        if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
        }
        const data = await response.json();
        csrfToken = data.token;
        console.log("Csrf token:", csrfToken);
        return csrfToken;
        
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
    }
}

// Step 1: Sign up and get QR code
async function signup(event) {
    event.preventDefault();
    
    try {
        // Ensure we have a CSRF token
        if (!csrfToken) {
            await fetchCsrfToken();
        }

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        currentUser = username;

        const res = await fetch('/signup', {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            throw new Error('Signup failed');
        }

        const data = await res.json();
        alert(data.message || 'Scan the QR code and continue');

        if (data.qrCode) {
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            document.getElementById('qrContainer').innerHTML = `<img src="${data.qrCode}" />`;
        }
    } catch (error) {
        console.error('Error during signup:', error);
        alert('Signup failed. Please try again.');
    }
}

// Step 2: Submit token to complete MFA setup
async function verifySignup(event) {
    event.preventDefault();
    
    try {
        // Ensure we have a CSRF token
        if (!csrfToken) {
            await fetchCsrfToken();
        }
    
    const mfaToken = document.getElementById('token').value;

    const res = await fetch('/verify-signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken //  include csrf token into the header to be sent through and use the global CSRF token
        },
        body: JSON.stringify({ username: currentUser, token: mfaToken})
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        window.location.href = '/login';
    }
} catch (error) {
        console.error('Error during MFA verification:', error);
        alert('MFA verification failed. Please try again.');
    }
}

//fetch csrf token on page load
window.onload = fetchCsrfToken;