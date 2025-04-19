"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileSpreadsheet, Clock, Users, AlertTriangle, RefreshCw, Calendar, BookOpen, CircleCheckBig } from "lucide-react"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

export default function TimeTableGenerator() {
  // 1. Add a new state for tracking file upload status
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    excel_file: "",
    slots: 20,
    capacity: 1000,
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [timetableData, setTimetableData] = useState(null)
  const [error, setError] = useState(null)
  const [swapType, setSwapType] = useState(1)
  const [courseList, setCourseList] = useState([])
  const [courseSlotMap, setCourseSlotMap] = useState({})
  const [selectedCourse, setSelectedCourse] = useState("")
  const [availableSlots, setAvailableSlots] = useState([])
  const [newSlot, setNewSlot] = useState("")
  const [slot1, setSlot1] = useState("")
  const [slot2, setSlot2] = useState("")
  const [day1, setDay1] = useState("")
  const [day2, setDay2] = useState("")
  const fileInputRef = useRef(null)

  // Extract course list from timetable data
  useEffect(() => {
    if (timetableData && timetableData.schedule) {
      const courses = timetableData.schedule.flatMap((slot) => slot.courses)
      setCourseList([...new Set(courses)].sort())

      const slotMap = {}
      timetableData.schedule.forEach((slot) => {
        slot.courses.forEach((course) => {
          slotMap[course] = slot.slot_number
        })
      })
      setCourseSlotMap(slotMap)
    }
  }, [timetableData])

  // 2. Replace the handleFileChange function with this updated version
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      // Reset form data and upload states
      setFormData({
        ...formData,
        excel_file: "", // Clear the excel_file field until upload is complete
      })
      setUploadError(null)
      setUploadSuccess(false)
    }
  }

  // 3. Add a new function to handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first")
      return
    }

    setUploadLoading(true)
    setUploadError(null)

    try {
      // Create FormData and append file
      const formData = new FormData()
      formData.append("file", selectedFile)

      // Send the file to the upload endpoint
      const response = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const data = await response.json()

      // Update the form data with the returned filename
      setFormData((prev) => ({
        ...prev,
        excel_file: data.filename,
      }))

      setUploadSuccess(true)
    } catch (err) {
      setUploadError(err.message || "File upload failed")
      console.error("Error uploading file:", err)
    } finally {
      setUploadLoading(false)
    }
  }

  // 4. Update the handleSubmit function to check for uploaded file
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.excel_file) {
      setError("Please upload a file first")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:3000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setTimetableData(data)
    } catch (err) {
      setError(err.message)
      console.error("Error fetching timetable:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "slots" || name === "capacity" ? Number.parseInt(value) || 0 : value,
    })
  }

  const fetchAvailableSlots = async () => {
    if (!selectedCourse) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:3000/available_positions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: selectedCourse,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setAvailableSlots(data.available_slots || [])
      setNewSlot(data.current_slot || "")
    } catch (err) {
      setError(err.message)
      console.error("Error fetching available slots:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const requestBody = {
      swap_type: swapType,
      params: {},
    }

    switch (swapType) {
      case 1:
        if (!selectedCourse || !newSlot) {
          setError("Please select a course and a new slot")
          setLoading(false)
          return
        }
        requestBody.params = {
          course: selectedCourse,
          new_slot: Number.parseInt(newSlot),
        }
        break
      case 2:
        if (!slot1 || !slot2) {
          setError("Please select both slots")
          setLoading(false)
          return
        }
        requestBody.params = {
          slot1: Number.parseInt(slot1),
          slot2: Number.parseInt(slot2),
        }
        break
      case 3:
        if (!day1 || !day2) {
          setError("Please select both days")
          setLoading(false)
          return
        }
        requestBody.params = {
          day1: Number.parseInt(day1),
          day2: Number.parseInt(day2),
        }
        break
      default:
        setError("Invalid swap type")
        setLoading(false)
        return
    }

    try {
      const response = await fetch("http://localhost:3000/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setTimetableData(data)

      // Reset form fields after successful swap
      if (swapType === 1) {
        setSelectedCourse("")
        setNewSlot("")
        setAvailableSlots([])
      } else if (swapType === 2) {
        setSlot1("")
        setSlot2("")
      } else if (swapType === 3) {
        setDay1("")
        setDay2("")
      }
    } catch (err) {
      setError(err.message)
      console.error("Error performing swap:", err)
    } finally {
      setLoading(false)
    }
  }

  const downloadExcel = async () => {
    if (!timetableData) return

    const workbook = new ExcelJS.Workbook()
    const scheduleSheet = workbook.addWorksheet("Schedule")
    const clashesSheet = workbook.addWorksheet("Clashes")

    // Style settings
    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6D7A8" } }, // light green
    }

    // Add schedule headers
    scheduleSheet.addRow(["Slot Number", "Courses", "Total Students"])
    scheduleSheet.getRow(1).eachCell((cell) => {
      Object.assign(cell, headerStyle)
    })

    // Add schedule data with slot-based color coding
    timetableData.schedule.forEach((slot, index) => {
      const row = scheduleSheet.addRow([slot.slot_number, slot.courses.join(", "), slot.total_students])

      const bgColors = [
        "FFFFF2CC",
        "FFD9EAD3",
        "FFCCE5FF",
        "FFF4CCCC",
        "FFEAD1DC", // pastel shades
        "FFD9D2E9",
        "FFFCF4DE",
        "FFEFE4B0",
        "FFFADAD9",
        "FFC9DAF8",
        "FFF6B26B",
        "FFB4A7D6",
        "FFA2C4C9",
        "FF76A5AF",
        "FF6AA84F",
      ]

      const color = bgColors[index % bgColors.length]
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        }
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
      })
    })

    // Add clashes headers
    clashesSheet.addRow(["Clash Type", "Count", "Student IDs"])
    clashesSheet.getRow(1).eachCell((cell) => {
      Object.assign(cell, headerStyle)
    })

    // Add clash data
    const clashData = [
      ["2 exams in a day", timetableData.clashes.clash2_count, timetableData.clashes.students_clash2.join(", ")],
      [
        "3 exams in 2 consecutive days",
        timetableData.clashes.clash3_count,
        timetableData.clashes.students_clash3.join(", "),
      ],
      [
        "4 exams in 2 consecutive days",
        timetableData.clashes.clash4_count,
        timetableData.clashes.students_clash4.join(", "),
      ],
    ]

    clashData.forEach((row) => {
      clashesSheet.addRow(row)
    })

    // Adjust column widths
    scheduleSheet.columns.forEach((column) => (column.width = 30))
    clashesSheet.columns.forEach((column) => (column.width = 40))

    // Export file
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), "timetable.xlsx")
  }
  // Generate array of numbers from 1 to max
  const generateNumberArray = (max) => {
    return Array.from({ length: max }, (_, i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === "generate"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("generate")}
            >
              Generate Timetable
            </button>
            <button
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === "swap"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("swap")}
              disabled={!timetableData}
            >
              Swap Options
            </button>
          </div>

          <div className="p-6">
            {activeTab === "generate" ? (
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Timetable Generator</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 5. Replace the Excel File input section in the form with this updated version */}
                    <div className="space-y-2 col-span-3 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Excel File</label>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".xlsx,.xls"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={uploadLoading}
                          >
                            <FileSpreadsheet className="h-5 w-5 mr-2 text-gray-400" />
                            Choose File
                          </button>
                          <span className="ml-3 text-sm text-gray-500 truncate max-w-xs">
                            {selectedFile ? selectedFile.name : "No file selected"}
                          </span>
                        </div>

                        {selectedFile && !uploadSuccess && (
                          <button
                            type="button"
                            onClick={handleFileUpload}
                            disabled={uploadLoading || !selectedFile}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadLoading ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              "Upload File"
                            )}
                          </button>
                        )}

                        {uploadError && <div className="text-sm text-red-600">{uploadError}</div>}

                        {uploadSuccess && (
                          <div className="text-sm text-green-600 flex flex-col">
                            <div className="flex items-center justify-start">
                            <CircleCheckBig className="w-4 h-4 mr-2"/>
                            <span> File uploaded successfully! </span>
                            </div>
                           
                            <span className="font-medium ml-1 mt-1">Filename: {formData.excel_file}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="slots" className="block text-sm font-medium text-gray-700">
                        Number of Slots
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          id="slots"
                          name="slots"
                          value={formData.slots}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                        Capacity
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          id="capacity"
                          name="capacity"
                          value={formData.capacity}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {/* 6. Update the Generate Timetable button to be disabled if no file is uploaded */}
                    <button
                      type="submit"
                      disabled={loading || !formData.excel_file}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        "Generate Timetable"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Swap Options</h1>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        swapType === 1
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => setSwapType(1)}
                    >
                      <BookOpen className="h-4 w-4 inline mr-1" />
                      Change Course Slot
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        swapType === 2
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => setSwapType(2)}
                    >
                      <RefreshCw className="h-4 w-4 inline mr-1" />
                      Swap Two Slots
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        swapType === 3
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => setSwapType(3)}
                    >
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Swap Two Days
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSwap} className="space-y-6">
                  {swapType === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                          <div className="relative z-10">
                            <select
                              value={selectedCourse}
                              onChange={(e) => {
                                setSelectedCourse(e.target.value)
                                setAvailableSlots([])
                              }}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-400 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select a course</option>
                              {courseList.map((course) => (
                                <option key={course} value={course}>
                                  {course}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={fetchAvailableSlots}
                            disabled={!selectedCourse || loading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              "Get Available Slots"
                            )}
                          </button>
                        </div>
                        {selectedCourse && courseSlotMap[selectedCourse] && (
                          <p className="text-sm  text-gray-600">
                            Current Slot: <strong>Slot {courseSlotMap[selectedCourse]}</strong>
                          </p>
                        )}
                      </div>

                      {availableSlots.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select New Slot</label>
                          <div className="relative z-10">
                            <select
                              value={newSlot}
                              onChange={(e) => setNewSlot(e.target.value)}
                              className="block pl-3 pr-10 py-2 text-base border border-gray-400 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select a slot</option>
                              {availableSlots.map((slot) => (
                                <option key={slot} value={slot}>
                                  Slot {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {swapType === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[slot1, slot2].map((slotVal, i) => (
                        <div key={i}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select {i === 0 ? "First" : "Second"} Slot
                          </label>
                          <div className="relative z-10">
                            <select
                              value={i === 0 ? slot1 : slot2}
                              onChange={(e) => (i === 0 ? setSlot1(e.target.value) : setSlot2(e.target.value))}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-400 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select a slot</option>
                              {timetableData &&
                                generateNumberArray(timetableData.schedule.length).map((num) => (
                                  <option key={num} value={num}>
                                    Slot {num}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {swapType === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[day1, day2].map((dayVal, i) => (
                        <div key={i}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select {i === 0 ? "First" : "Second"} Day
                          </label>
                          <div className="relative z-10">
                            <select
                              value={i === 0 ? day1 : day2}
                              onChange={(e) => (i === 0 ? setDay1(e.target.value) : setDay2(e.target.value))}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-400 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select a day</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <option key={num} value={num}>
                                  Day {num}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        "Apply Swap"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {timetableData && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Timetable Results</h2>
              <button
                onClick={downloadExcel}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Excel
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Schedule Summary</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Minimum slots required: <span className="font-semibold">{timetableData.min_slots}</span>
                </p>
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Slot
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Courses
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Students
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timetableData.schedule.map((slot) => (
                        <tr key={slot.slot_number} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {slot.slot_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {slot.courses.map((course) => (
                                <span
                                  key={course}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {course}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slot.total_students}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Clash Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">2 Exams in a Day</h4>
                        <p className="text-sm text-yellow-700 mt-1">{timetableData.clashes.clash2_count} students</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-orange-100 rounded-md p-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-orange-800">3 Exams in Two Consecutive Days</h4>
                        <p className="text-sm text-orange-700 mt-1">{timetableData.clashes.clash3_count} students</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 rounded-md p-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-red-800">4 Exams in Two Consecutive Days</h4>
                        <p className="text-sm text-red-700 mt-1">{timetableData.clashes.clash4_count} students</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="collapse-panel">
                    <details className="bg-gray-50 rounded-lg border border-gray-200">
                      <summary className="cursor-pointer p-4 font-medium flex items-center justify-between">
                        <span>Students with 2 Exams in a Day ({timetableData.clashes.students_clash2.length})</span>
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-4 pt-0 bg-white border-t border-gray-200">
                        <div className="flex flex-wrap gap-2 mt-2">
                          {timetableData.clashes.students_clash2.map((student) => (
                            <span
                              key={student}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="collapse-panel">
                    <details className="bg-gray-50 rounded-lg border border-gray-200">
                      <summary className="cursor-pointer p-4 font-medium flex items-center justify-between">
                        <span>
                          Students with 3 Exams in Two Consecutive Days ({timetableData.clashes.students_clash3.length})
                        </span>
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-4 pt-0 bg-white border-t border-gray-200">
                        <div className="flex flex-wrap gap-2 mt-2">
                          {timetableData.clashes.students_clash3.map((student) => (
                            <span
                              key={student}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>

                  {timetableData.clashes.students_clash4.length > 0 && (
                    <div className="collapse-panel">
                      <details className="bg-gray-50 rounded-lg border border-gray-200">
                        <summary className="cursor-pointer p-4 font-medium flex items-center justify-between">
                          <span>
                            Students with 4 Exams in Two Consecutive Days (
                            {timetableData.clashes.students_clash4.length})
                          </span>
                          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="p-4 pt-0 bg-white border-t border-gray-200">
                          <div className="flex flex-wrap gap-2 mt-2">
                            {timetableData.clashes.students_clash4.map((student) => (
                              <span
                                key={student}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {student}
                              </span>
                            ))}
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
