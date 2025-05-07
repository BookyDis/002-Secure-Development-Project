let csrfToken = '';

    // Fetch the CSRF token once on page load
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

    async function signup(event) {
        event.preventDefault();

        const postId = req.body.postId;
    
        const res = await fetch('/dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
               //send csrf token along with the header
               'x-csrf-token': csrfToken
             },
        });
        
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }
        
        try {
            // Delete the post where the postId matches and the author is the logged-in user
            const result = await db.query(
                'DELETE FROM posts WHERE id = $1 AND author = $2',
                [postId, req.session.user]
            );
        
            if (result.rowCount === 0) {
                return res.status(404).send('Post not found or you do not have permission to delete it');
            }
        
            res.status(200).json({ message: 'Post deleted successfully' });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).send('Server error');
        }
    }