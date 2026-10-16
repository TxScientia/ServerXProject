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

## Continuous Integration

The [GitHub Actions workflow](.github/workflows/ci.yml) runs on pull requests and pushes to `main`. Two independent jobs run in parallel:

- **Backend (Python 3.15):** runs pytest with coverage, then Pylint. Reports are uploaded as the `backend-quality-reports` artifact (`backend/coverage.xml` and `backend/pylint-report.txt`). Pylint remains a strict check; existing lint issues can fail the job even when tests pass.
- **Frontend (Node.js 24):** installs locked dependencies with `npm ci`, builds the app (including TypeScript checks), and runs Vitest in non-watch mode with V8 coverage. The LCOV report is uploaded as `frontend-coverage`. Coverage targets source files rather than generated build output. ESLint is not run because the project has no ESLint configuration.

Both jobs cache dependencies and have a 15-minute timeout. A new run cancels an older run for the same branch or pull request. Report uploads are attempted even after a failed step, but only reports already generated can be included. No SonarQube service or secrets are required.

### Run the checks locally

From the repository root, with a Python virtual environment activated:

```bash
python -m pip install -r backend/requirements.txt
python -m pip install pylint pytest-cov
python -m pytest --cov=backend/app --cov-report=term-missing --cov-report=xml:backend/coverage.xml
pylint --source-roots=. backend/app backend/tests --output-format=parseable --reports=no
```

For the frontend:

```bash
cd frontend
npm ci
npm run build
npm run test:ci -- --coverage --coverage.reporter=text --coverage.reporter=lcov
```

Frontend coverage is written to `frontend/coverage/lcov.info`.

## License

This project is licensed under the **CC BY-NC 4.0** license.  
You may use, share, and modify it — but **not for commercial purposes**.  
See: [https://creativecommons.org/licenses/by-nc/4.0](https://creativecommons.org/licenses/by-nc/4.0)