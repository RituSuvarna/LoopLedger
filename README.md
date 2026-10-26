# LoopLedger ♻️
### E-Waste Recovery & Circular Economy Management Platform

LoopLedger is a web-based platform designed to help organizations track electronic waste, assess device conditions, and identify potential recovery pathways such as reuse, repair, refurbishment, and recycling.

The project demonstrates how structured inventory management and transparent, rule-based recommendations can support more responsible electronic waste handling.

## Problem Statement

Organizations often retire electronic devices without having a clear, centralized record of their condition, quantity, or potential recovery options. This can make it difficult to prioritize repair, reuse, and responsible recycling.

LoopLedger provides a centralized inventory and an explainable recommendation workflow to help organize this process.

## Key Features

- **Dashboard:** View inventory metrics and recovery summaries.
- **Device Inventory:** Add, view, search, update, filter, and remove device records.
- **Recovery Recommendations:** Generate rule-based suggestions based on device condition, age, and other recorded attributes.
- **Analytics:** Explore inventory categories, recovery recommendations, and estimated material impact.
- **Activity and Settings:** Navigate the workspace, change appearance settings, and restore demo records.
- **CSV Export:** Export inventory data for further analysis.
- **Responsive Interface:** Designed for desktop, tablet, and mobile screens.
- **REST API:** Manage device records and retrieve analytics through API endpoints.
- **Persistent Local Data:** Store device records in a JSON file on the server.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Responsive styling and themes |
| JavaScript | Frontend interactions |
| Node.js | Server runtime |
| Express.js | REST API and routing |
| Helmet | HTTP security headers |
| JSON | Local demo data storage |
| Chart.js | Interactive charts |

## Project Structure

```text
LoopLedger/
├── public/
│   ├── index.html
│   ├── 404.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       └── charts.js
├── src/
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── devices.js
│   │   └── analytics.js
│   └── utils/
│       └── recoveryEngine.js
├── data/
│   └── devices.json
├── docs/
│   └── architecture.md
├── package.json
├── server.js
├── README.md
├── LICENSE
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A modern web browser

### Installation

1. Clone this repository or download the project.
2. Open the project folder in VS Code.
3. Open a terminal in the project directory.
4. Install the dependencies:

```bash
npm install
```

5. Start the application:

```bash
npm start
```

6. Open this address in your browser:

```text
http://localhost:3000
```

For development, use:

```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server health |
| GET | `/api/devices` | List and filter devices |
| GET | `/api/devices/:id` | Retrieve one device |
| POST | `/api/devices` | Add a device |
| PUT | `/api/devices/:id` | Update a device |
| DELETE | `/api/devices/:id` | Delete a device |
| POST | `/api/devices/reset-demo` | Restore demo records |
| GET | `/api/analytics` | Retrieve analytics |

## Recommendation Method

LoopLedger uses a transparent, rule-based recovery engine. It evaluates recorded device attributes and produces a suggested recovery action.

These recommendations are decision-support suggestions, not professional recycling assessments. Actual recovery decisions should account for electrical safety, data security, repair costs, local regulations, and the availability of authorized recycling facilities.

## Demo Data and Limitations

The included records are fictional demonstration data. Estimated recovery and environmental metrics are illustrative calculations, not independently verified environmental impact measurements.

The project is a prototype. The JSON file storage is intended for a small demonstration, not concurrent multi-user production workloads. Authentication, role-based permissions, a production database, audit controls, and protection for administrative actions should be added before real organizational deployment.

## Future Enhancements

- Database integration with PostgreSQL or MongoDB
- Secure authentication and role-based access
- Device collection and recycling partner tracking
- Audit history for inventory changes
- Verified environmental impact factors
- Deployment monitoring and automated tests

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for details.