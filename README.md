# 💬 RD and Maturity Calculation Chatbot

This is an AI-powered chatbot application that helps users calculate **Recurring Deposit (RD) maturity amounts** through a conversational interface. Built using **React** for the frontend and **Node.js** for the backend, the chatbot integrates the **OpenAI API** to understand and respond to user queries intelligently.

---

## ✨ Features

- 💡 Smart chatbot using OpenAI's GPT for natural language understanding
- 🧮 Calculates RD maturity based on:
  - Monthly deposit
  - Interest rate
  - Duration
- 🧑‍💻 Interactive and responsive frontend with React
- ⚙️ Backend logic in Node.js for API handling and computation
- 🔒 Secure integration with OpenAI using API key

---

## 🛠️ Technologies Used

| Layer       | Tech Stack           |
|-------------|----------------------|
| Frontend    | React (JavaScript)   |
| Backend     | Node.js, Express     |
| AI/NLP      | OpenAI API (GPT)     |
| Others      | Axios, dotenv, CORS  |

---

## 📐 RD Maturity Formula

The maturity value of a recurring deposit is calculated using the formula:

M = P × (1 + r/n)^(nt)


Where:
- `M` = Maturity amount  
- `P` = Monthly installment  
- `r` = Annual interest rate (in decimal)  
- `n` = Compounding frequency (monthly = 12)  
- `t` = Tenure in years  

---

## 📁 Project Structure

RD-and-Maturity-calculation-chatbot/
│
├── client/ # React frontend
│ ├── public/
│ └── src/
│ ├── components/
│ └── App.js
│
├── server/ # Node.js backend
│ ├── routes/
│ ├── controllers/
│ └── index.js
│
├── .env # Contains OpenAI API key
├── package.json
└── README.md

---

## 🚀 Getting Started

### 1. Clone the Repository
git clone https://github.com/urvish2930/RD-and-Maturity-calulation-chatbot.git
cd RD-and-Maturity-calulation-chatbot

2. Set Up Backend
cd server
npm install

Create a .env file and add your OpenAI API key:
OPENAI_API_KEY=your_openai_api_key_here

Run the backend:
node index.js

3. Set Up Frontend

cd ../client
npm install
npm start
The frontend will run on http://localhost:3000 and communicate with the backend for chat and RD calculation.

🔐 Environment Variables
Key	Description
OPENAI_API_KEY	Your OpenAI API key

## 🖼️ Screenshots

### 🏠 Homepage  
![Homepage](https://github.com/urvish2930/RD-and-Maturity-calulation-chatbot/blob/main/frontend/public/Screenshot%202025-07-12%20173503.png?raw=true)

### 📃 Chatbot interface page 
![Chatbot interface page](https://github.com/urvish2930/RD-and-Maturity-calulation-chatbot/blob/main/frontend/public/Screenshot%202025-07-12%20173623.png?raw=true)

### 📝 Calculations with Chatbot 
![Calculations with Chatbot](https://github.com/urvish2930/RD-and-Maturity-calulation-chatbot/blob/main/frontend/public/Screenshot%202025-07-12%20173944.png?raw=true)
![Calculations with Chatbot](https://github.com/urvish2930/RD-and-Maturity-calulation-chatbot/blob/main/frontend/public/Screenshot%202025-07-12%20174009.png?raw=true)

🙌 Contributing
Contributions, issues and feature requests are welcome!
Feel free to fork the repo and submit a pull request.

📄 License
This project is licensed under the MIT License.

📬 Contact
Created by @urvish2930
For issues, please open a GitHub issue.
