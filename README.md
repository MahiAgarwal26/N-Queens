# N-Queens CSP Visualizer  
### Interactive Visualization of Constraint Satisfaction Algorithms  
*(Inspired by VisuAlgo & AI-Space)*

---

## Overview
This project is an **interactive web-based visualizer** that demonstrates how different **CSP algorithms** solve the classic **N-Queens problem**.  
It helps learners understand:

- Backtracking Search  
- Forward Checking (FC)  
- Minimum Remaining Values (MRV)  
- Constraint Propagation  
- Search tree exploration

The visualizer is built using **pure HTML, CSS, and JavaScript**.

---

## Features

### Algorithms Implemented
- **Backtracking (BT)** – simple DFS search  
- **Forward Checking (FC)** – prunes invalid domain values early  
- **MRV + Forward Checking** – selects the row with the fewest domain values  

### Visualization Tools
- Step-by-step queen placement & removal  
- Highlighted conflicts  
- Live **domain table** (visible only for FC / MRV modes)  
- Detailed step log explaining what is happening  
- Real-time counters for:
  - Assignments  
  - Backtracks  
  - Domain prunes  

### Controls
- Select **N size**  
- Choose **algorithm mode**  
- Adjust **animation speed**  

---

## CSP Concepts Demonstrated

### Backtracking Search  
Recursive depth-first approach with conflict checking.

### Forward Checking  
Maintains domain lists for each row and prunes invalid values before deeper recursion.

### MRV Heuristic  
Chooses the next variable (row) with the **minimum remaining valid columns**, greatly reducing search effort.

## Contributors

### Mahi
Implemented core N-Queens visualization (board, rendering, animations)

Added UI controls and interaction flow (run, step, reset)

### Omkar
Developed CSP algorithms (Backtracking, Forward Checking, MRV)

Integrated step-wise generator logic and constraint propagation

### Aditya
Structured project into HTML/CSS/JS files

Wrote documentation and improved layout, logs, and counter
