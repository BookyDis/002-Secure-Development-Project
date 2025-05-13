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

//Common password blacklist
const commonPasswords = [
    '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567'
];

function validatePasswordSecurity(password, confirmPassword) {
    if (password !== confirmPassword) {
        return 'Passwords do not match.';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (password.length > 64) {
        return 'Password must be less than 64 characters.';
    }
    if (commonPasswords.includes(password)) {
        return 'Password is too common. Please choose a more secure one.';
    }
    
    return null; // no errors
}

 // Step 1: Sign up and get QR code
 async function signup(event) {
     event.preventDefault();

     const username = document.getElementById('username').value;
     const password = document.getElementById('password').value;
     const confirmPassword = document.getElementById('confirmPassword').value;
     currentUser = username;

     const validationError = validatePasswordSecurity(password, confirmPassword);
     if (validationError) {
         alert(validationError);
         return;
     }

     const res = await fetch('/signup', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json',
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
         headers: { 'Content-Type': 'application/json',
            //send csrf token along with the header
            'x-csrf-token': csrfToken },
         body: JSON.stringify({ username: currentUser, token })
     });

     const data = await res.json();
     alert(data.message);

     if (res.ok) {
         window.location.href = '/login';
     }
    }