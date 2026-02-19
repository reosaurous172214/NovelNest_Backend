

<h1 style="color:#2c3e50;">📚 NovelHub Backend | Archive Core</h1>
<p><strong>Status:</strong> Operational 🟢 | <strong>Version:</strong> 1.0.0</p>
<p><strong>Live Demo:</strong> <a href="https://novelhub.example.com" target="_blank" style="color:#2980b9; text-decoration:none;">Click here to access</a></p>

<p>NovelHub Backend is the central intelligence node of the platform. It manages user authentication, novel metadata, and a high-performance chapter archival system, providing seamless access to readers and developers alike.</p>

<hr style="margin:30px 0; border:0; border-top:2px solid #eee;">

<h2 style="color:#2c3e50;">🛠 Tech Stack</h2>
<p>
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT">
</p>

<hr style="margin:30px 0; border:0; border-top:2px solid #eee;">

<h2 style="color:#2c3e50;">📡 API Architecture</h2>
<p>The system is built using a strict <strong>MVC (Model-View-Controller)</strong> pattern to ensure modularity, scalability, and maintainable code.</p>
<p>[Insert MVC Architecture Diagram Here]</p>

<details>
<summary style="cursor:pointer; font-weight:bold; margin:10px 0;">🔐 Authentication Endpoints</summary>
<table style="width:100%; border-collapse:collapse; margin:10px 0;">
<thead>
<tr style="background-color:#2c3e50; color:white;">
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Method</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Endpoint</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #ddd; padding:10px;">POST</td>
<td style="border:1px solid #ddd; padding:10px;">/api/auth/register</td>
<td style="border:1px solid #ddd; padding:10px;">Create a new user account</td>
</tr>
<tr>
<td style="border:1px solid #ddd; padding:10px;">POST</td>
<td style="border:1px solid #ddd; padding:10px;">/api/auth/login</td>
<td style="border:1px solid #ddd; padding:10px;">Authenticate user and return JWT</td>
</tr>
</tbody>
</table>
</details>

<details>
<summary style="cursor:pointer; font-weight:bold; margin:10px 0;">📖 Novels & Archive Endpoints</summary>
<table style="width:100%; border-collapse:collapse; margin:10px 0;">
<thead>
<tr style="background-color:#2c3e50; color:white;">
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Method</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Endpoint</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #ddd; padding:10px;">GET</td>
<td style="border:1px solid #ddd; padding:10px;">/api/novels</td>
<td style="border:1px solid #ddd; padding:10px;">Fetch all novels (supports search/filter)</td>
</tr>
<tr>
<td style="border:1px solid #ddd; padding:10px;">GET</td>
<td style="border:1px solid #ddd; padding:10px;">/api/novels/:id</td>
<td style="border:1px solid #ddd; padding:10px;">Get detailed information for a specific novel</td>
</tr>
<tr>
<td style="border:1px solid #ddd; padding:10px;">GET</td>
<td style="border:1px solid #ddd; padding:10px;">/api/chapters/:novelId/num/:num</td>
<td style="border:1px solid #ddd; padding:10px;">Retrieve a specific chapter</td>
</tr>
</tbody>
</table>
</details>

<details>
<summary style="cursor:pointer; font-weight:bold; margin:10px 0;">👤 User Library & History</summary>
<table style="width:100%; border-collapse:collapse; margin:10px 0;">
<thead>
<tr style="background-color:#2c3e50; color:white;">
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Method</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Endpoint</th>
<th style="border:1px solid #ddd; padding:10px; text-align:left;">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #ddd; padding:10px;">POST</td>
<td style="border:1px solid #ddd; padding:10px;">/api/lib/history/:novelId/last/:num</td>
<td style="border:1px solid #ddd; padding:10px;">Sync reading progress (Authorized users only)</td>
</tr>
</tbody>
</table>
</details>

<hr style="margin:30px 0; border:0; border-top:2px solid #eee;">

<h2 style="color:#2c3e50;">🚀 Local Deployment</h2>

<h3 style="color:#34495e;">1. Clone the Repository</h3>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
git clone https://github.com/SaurabhSharma1369/NovelNest_Backend.git
cd NovelNest_Backend
</pre>

<h3 style="color:#34495e;">2. Install Dependencies</h3>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
npm install
</pre>

<h3 style="color:#34495e;">3. Configure Environment</h3>
<p>Create a <code>.env</code> file in the root directory (do not commit it):</p>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
</pre>

<h3 style="color:#34495e;">4. Start the Server</h3>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
npm start
</pre>

<h3 style="color:#34495e;">Development Mode (Nodemon)</h3>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
npm run dev
</pre>

<h3 style="color:#34495e;">⚠️ Security Protocols</h3>
<ul style="margin-left:20px;">
<li><strong>JWT Encryption:</strong> All sensitive routes require a valid Bearer token in the Authorization header.</li>
<li><strong>Bcrypt Hashing:</strong> User passwords are encrypted with a 10-round salt before database entry.</li>
<li><strong>CORS Policy:</strong> Only authorized frontend domains can access the backend to prevent unauthorized cross-origin requests.</li>
</ul>

<h3 style="color:#34495e;">📂 Directory Structure</h3>
<pre style="background-color:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:8px; overflow-x:auto;">
backend/
├── controllers/    # Request handling logic
├── models/         # Database schemas (Mongoose)
├── routes/         # API endpoint definitions
├── middleware/     # Auth & Error handling
├── config/         # Database connection setup
└── server.js       # Main entry point
</pre>

<p>Developed by <strong>Saurabh Sharma</strong></p>
