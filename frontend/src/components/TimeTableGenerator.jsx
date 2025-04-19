import { useState } from "react"
import { Download, FileSpreadsheet, Clock, Users, AlertTriangle } from "lucide-react"
import * as XLSX from "xlsx"

export default function TimeTableGenerator() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    excel_file: "",
    slots: 20,
    capacity: 1000,
  })
  const [timetableData, setTimetableData] = useState(null)
  const [error, setError] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "slots" || name === "capacity" ? Number.parseInt(value) || 0 : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

  const downloadExcel = () => {
    if (!timetableData) return

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()

    // Create schedule worksheet
    const scheduleData = [
      ["Slot Number", "Courses", "Total Students"],
      ...timetableData.schedule.map((slot) => [slot.slot_number, slot.courses.join(", "), slot.total_students]),
    ]
    const scheduleWs = XLSX.utils.aoa_to_sheet(scheduleData)
    XLSX.utils.book_append_sheet(wb, scheduleWs, "Schedule")

    // Create clashes worksheet
    const clashesData = [
      ["Clash Type", "Count", "Student IDs"],
      ["2 exams in a day", timetableData.clashes.clash2_count, timetableData.clashes.students_clash2.join(", ")],
      ["3 exams in 2 consecutive days ", timetableData.clashes.clash3_count, timetableData.clashes.students_clash3.join(", ")],
      ["4 exams in 2 consecutive days", timetableData.clashes.clash4_count, timetableData.clashes.students_clash4.join(", ")],
    ]
    const clashesWs = XLSX.utils.aoa_to_sheet(clashesData)
    XLSX.utils.book_append_sheet(wb, clashesWs, "Clashes")

    // Save the file
    XLSX.writeFile(wb, "timetable.xlsx")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Timetable Generator</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="excel_file" className="block text-sm font-medium text-gray-700">
                  Excel File Path
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="excel_file"
                    name="excel_file"
                    value={formData.excel_file}
                    onChange={handleInputChange}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="C:\path\to\file.xlsx"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="slots" className="block text-sm font-medium text-gray-700">
                  Number of Slots
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="slots"
                    name="slots"
                    value={formData.slots}
                    onChange={handleInputChange}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  Capacity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

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
                    Generating...
                  </>
                ) : (
                  "Generate Timetable"
                )}
              </button>
            </div>
          </form>
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
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Timetable Results</h2>
              <button
                onClick={downloadExcel}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Excel
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Schedule Summary</h3>
              <p className="text-sm text-gray-600 mb-2">
                Minimum slots required: <span className="font-semibold">{timetableData.min_slots}</span>
              </p>
              <div className="overflow-x-auto">
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
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">2 Exams In a Day</h4>
                      <p className="text-sm text-yellow-700 mt-1">{timetableData.clashes.clash2_count} students</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-orange-100 rounded-md p-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-orange-800">3 Exams In Two Consecutive Days</h4>
                      <p className="text-sm text-orange-700 mt-1">{timetableData.clashes.clash3_count} students</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-100 rounded-md p-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">4 Exams In Two Consecutive Days</h4>
                      <p className="text-sm text-red-700 mt-1">{timetableData.clashes.clash4_count} students</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="collapse-panel">
                  <details className="bg-gray-50 rounded-lg">
                    <summary className="cursor-pointer p-4 font-medium">
                      Students With 2 Exams In a Day ({timetableData.clashes.students_clash2.length})
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
                  <details className="bg-gray-50 rounded-lg">
                    <summary className="cursor-pointer p-4 font-medium">
                      Students With 3 Exams In Two Consecutive Days ({timetableData.clashes.students_clash3.length})
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
                    <details className="bg-gray-50 rounded-lg">
                      <summary className="cursor-pointer p-4 font-medium">
                        Students With 4 Exams In Two Consecutive Days({timetableData.clashes.students_clash4.length})
                      </summary>
                      <div className="p-4 pt-0 bg-white border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
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
        )}
      </div>
    </div>
  )
}
