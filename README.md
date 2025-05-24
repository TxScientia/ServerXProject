# ServerXProject

built with:

- ⚛️ [React](https://reactjs.org/) – frontend
- 🐍 [FastAPI](https://fastapi.tiangolo.com/) – backend
- 🐘 [PostgreSQL](https://www.postgresql.org/) – database
- 🐳 [Docker](https://www.docker.com/) – containerization

## Project Structure

ServerXProject/  
├── frontend/ # React frontend  
├── backend/ # FastAPI backend  
│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── app/ # contains main.py  
├── docker-compose.yml  
├── LICENSE.txt  
├── .gitignore    
└── README.md  


## Getting Started

### Prerequisites

To run this project, you need the following software installed depending on your setup:

- [Docker](https://docs.docker.com/get-docker/) — **required** to run both frontend and backend containers  
- [Node.js](https://nodejs.org/) — *only if you want to run or develop the frontend locally without Docker*  
- [Python 3.11+](https://www.python.org/) — *only if you want to run the backend locally without Docker*


### Run with Docker (recommended)

```bash
docker-compose up --build
```

Frontend: http://localhost:3000

Backend (API): http://localhost:8000

PostgreSQL: running on port 5432

## License

This project is licensed under the **CC BY-NC 4.0** license.  
You may use, share, and modify it — but **not for commercial purposes**.  
See: [https://creativecommons.org/licenses/by-nc/4.0](https://creativecommons.org/licenses/by-nc/4.0)