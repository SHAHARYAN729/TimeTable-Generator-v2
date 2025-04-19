import { useState } from 'react'
// import TimeTableGenerator from "./components/TimeTableGenerator.jsx"
import TimeTableGenerator from "./components/TimeTableGeneratorV2.jsx"
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <TimeTableGenerator/>
    </>
  )
}

export default App
