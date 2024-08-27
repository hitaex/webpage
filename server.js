const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Setup SQLite database
const db = new sqlite3.Database('./blog.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER, name TEXT, content TEXT, FOREIGN KEY(postId) REFERENCES posts(id))");
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the blog page
app.get('/blog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

// Serve individual post
app.get('/post/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM posts WHERE id = ?", [id], (err, post) => {
        if (err || !post) {
            res.status(404).send('Post not found.');
            return;
        }
        db.all("SELECT * FROM comments WHERE postId = ?", [id], (err, comments) => {
            if (err) {
                res.status(500).send('Error retrieving comments.');
                return;
            }
            res.send(`
                <!DOCTYPE html>
                <html lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${post.title}</title>
                    <link rel="stylesheet" href="styles.css">
                </head>
                <body>
                    <h1>${post.title}</h1>
                    <p>${post.content}</p>
                    <h2>Comments</h2>
                    ${comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.name}:</strong>
                            <p>${comment.content}</p>
                        </div>
                    `).join('')}
                    <h2>Add a Comment</h2>
                    <form id="commentForm">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name" required><br>
                        <label for="comment">Comment:</label>
                        <textarea id="comment" name="comment" required></textarea><br>
                        <button type="submit">Add Comment</button>
                    </form>
                    <script>
                        document.getElementById('commentForm').addEventListener('submit', async (event) => {
                            event.preventDefault();
                            const formData = new FormData(event.target);
                            const data = Object.fromEntries(formData);
                            await fetch('/add-comment', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: new URLSearchParams({ ...data, postId: ${id} }),
                            });
                            location.reload();
                        });
                    </script>
                </body>
                </html>
            `);
        });
    });
});

// Add a new post
app.post('/add-post', (req, res) => {
    const { title, content, captcha, captchaValue } = req.body;
    if (!title || !content || captcha !== captchaValue) {
        res.status(400).send('All fields are required and CAPTCHA must be correct.');
        return;
    }
    db.run("INSERT INTO posts (title, content) VALUES (?, ?)", [title, content], (err) => {
        if (err) {
            res.status(500).send('Error adding post.');
            return;
        }
        res.redirect('/blog.html');
    });
});

// Add a comment
app.post('/add-comment', (req, res) => {
    const { name, comment, postId } = req.body;
    if (!name || !comment || !postId) {
        res.status(400).send('All fields are required.');
        return;
    }
    db.run("INSERT INTO comments (postId, name, content) VALUES (?, ?, ?)", [postId, name, comment], (err) => {
        if (err) {
            res.status(500).send('Error adding comment.');
            return;
        }
        res.redirect(`/post/${postId}`);
    });
});

// Get all posts
app.get('/posts', (req, res) => {
    db.all("SELECT * FROM posts", [], (err, rows) => {
        if (err) {
            res.status(500).send('Error retrieving posts.');
            return;
        }
        res.json(rows);
    });
});app.get('/post/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'post.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
