# TimeTable Generator v2

A full-stack application designed to automate the creation of exam timetables. It processes an Excel file of student course enrollments and employs graph coloring (DSATUR) alongside bitmask dynamic programming to output an optimized schedule that minimizes exam clashes.

## Features

- Automated Scheduling: Generates timetables based on provided slot limits and capacity.
- Clash Optimization: Actively minimizes cases where students have multiple exams in a single day or consecutive exams.
- Interactive Adjustments: Allows administrators to manually swap courses, slots, or days using a web interface.
- Excel Export: Downloads the finalized schedule, clash summary, and individual student reports as an Excel workbook.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, ExcelJS
- Backend API and Algorithm: C++, Crow Framework, nlohmann/json
- Data Processing: Python 3, openpyxl

## Architecture and Data Flow

1. Input: The user uploads an .xlsx file containing course names and enrolled student IDs via the React frontend.
2. Data Extraction: The C++ server receives the file and invokes a Python script (openpyxl) to convert the spreadsheet into a structured JSON file.
3. Graph Construction: The C++ backend reads the JSON data to build a student-course conflict graph.
4. Scheduling Algorithm: The engine applies graph coloring to form cliques, checks slot capacity constraints, and uses dynamic programming to optimize slot placement.
5. Interactive UI: The frontend receives the generated schedule, renders it, and provides manual swap options.
6. Export: The finalized timetable can be downloaded back into an Excel format directly from the browser.

## Getting Started

### Prerequisites

- Node.js and npm
- C++17 compatible compiler
- CMake
- Python 3
- Python packages (openpyxl)

### Setup

1. Install Python dependencies:

```bash
cd server
pip3 install openpyxl
```

2. Build and run the C++ backend:

```bash
cd server
mkdir build
cd build
cmake ..
cmake --build .
./MyCrowProject
```

3. Setup and start the frontend:

```bash
cd frontend
npm install
npm run dev
```
