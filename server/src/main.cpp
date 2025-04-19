
#include <iostream>
#include <cstdlib>
#include <algorithm>
#include <utility>
#include <numeric>
#include <vector>
#include <set>
#include <map>
#include <ios>
#include <string>
#include <unordered_set>
#include <unordered_map>
#include <cmath>
#include <stdio.h>
#include <bitset>
#include <deque>
#include <stack>
#include <queue>
#include <iterator>
#include <climits>
#include <cstring>
#include <math.h>
#include <iomanip>
#include <random>
#include <ctime> // for time()
#include <list>
#include <fstream>
#include <chrono>
#include <filesystem>
#include "json.hpp"
#include "crow.h"

using json = nlohmann::json;
using namespace std;
std::mt19937 gen(static_cast<unsigned int>(time(0)));
// Global variables to store the state between API calls
map<string, vector<string>> course;
unordered_map<string, int> courseNumber;
unordered_map<int, string> numberCourse;
unordered_map<string, vector<int>> studentCourse;
vector<vector<int>> bestSchedule;
int courseCnt;
int slots;
int days;
// Changed from fixed arrays to vectors for MSVC compatibility
vector<vector<int>> adj;   // was int adj[21][21]
vector<vector<int>> clash; // was int clash[21][21]
vector<int> courseCount;   // was int courseCount[21]

// Changed from fixed arrays to vectors
vector<vector<int>> dp;                // was int dp[20][1<<20]
vector<vector<pair<int, int>>> parent; // was pair<int, int> parent[20][1<<20]

int popcount(unsigned int x)
{
    int count = 0;
    while (x)
    {
        count += x & 1;
        x >>= 1;
    }
    return count;
}

// Dynamic Programming with bitmasks for minimum number of 2 exams on a day cases
int func(int cur, int mask, int n, vector<vector<int>> &clashCount, vector<int> &order)
{
    if (mask == 0)
        return 0;
    if (dp[cur][mask] != -1)
        return dp[cur][mask];
    int ans = INT_MAX;
    for (int i = 0; i < n; i++)
    {
        int bit = 1 << i;
        int c = popcount(mask);
        if ((bit & mask) == 0)
            continue;
        int val = func(order[i], mask ^ bit, n, clashCount, order);
        if (c % 2 == 0)
        {
            if (val < ans)
            {
                parent[cur][mask] = make_pair(order[i], mask ^ bit);
                ans = val;
            }
        }
        else
        {
            if (val + clashCount[cur][order[i]] < ans)
            {
                parent[cur][mask] = make_pair(order[i], mask ^ bit);
                ans = val + clashCount[cur][order[i]];
            }
        }
    }
    return dp[cur][mask] = ans;
}

// Helper function to calculate clashes
json calculateClashes()
{
    int clash2 = 0, clash3 = 0, clash4 = 0;
    unordered_map<int, int> bestCourseClique;
    unordered_set<string> studentClash2, studentClash3, studentClash4;

    for (int i = 0; i < slots; i++)
    {
        for (auto &j : bestSchedule[i])
        {
            bestCourseClique[j] = i;
        }
    }

    for (auto &i : studentCourse)
    {
        vector<int> v;
        string student = i.first;
        for (auto &j : i.second)
        {
            v.push_back(bestCourseClique[j]);
        }
        sort(v.begin(), v.end());
        int sze = v.size();
        for (int j = 1; j < sze; j++)
        {
            if (v[j] % 2 == 1 && v[j] == v[j - 1] + 1)
            {
                studentClash2.insert(student);
                clash2++;
            }
        }
        for (int j = 3; j < sze; j++)
        {
            if (v[j] % 2 == 1 && v[j] == v[j - 3] + 3)
            {
                studentClash4.insert(student);
                clash4++;
            }
        }
        // Changed VLA to vector
        vector<int> examDayCount(days, 0); // was int examDayCount[days]{0}
        vector<int> oneExam, twoExam;
        for (int j = 0; j < sze; j++)
        {
            examDayCount[v[j] / 2]++;
        }
        for (int k = 0; k < days; k++)
        {
            if (examDayCount[k] == 1)
                oneExam.push_back(k + 1);
            if (examDayCount[k] == 2)
                twoExam.push_back(k + 1);
        }
        for (auto &entry : twoExam)
        {
            int F = 0;
            for (auto &j : oneExam)
            {
                if (entry == j + 1)
                    F = 1;
                if (entry == j - 1)
                    F = 1;
            }
            if (F)
            {
                clash3++;
                studentClash3.insert(student);
            }
        }
    }

    json result;
    result["clash2_count"] = clash2;
    result["clash3_count"] = clash3;
    result["clash4_count"] = clash4;

    // Convert sets to arrays for JSON
    json sc2 = json::array();
    for (auto &s : studentClash2)
        sc2.push_back(s);

    json sc3 = json::array();
    for (auto &s : studentClash3)
        sc3.push_back(s);

    json sc4 = json::array();
    for (auto &s : studentClash4)
        sc4.push_back(s);

    result["students_clash2"] = sc2;
    result["students_clash3"] = sc3;
    result["students_clash4"] = sc4;

    return result;
}

// Helper function to format schedule as JSON
json formatSchedule()
{
    json schedule = json::array();

    for (int i = 0; i < slots; i++)
    {
        json slot;
        slot["slot_number"] = i + 1;

        json courses = json::array();
        int total = 0;

        for (auto &j : bestSchedule[i])
        {
            courses.push_back(numberCourse[j]);
            total += courseCount[j];
        }

        slot["courses"] = courses;
        slot["total_students"] = total;
        schedule.push_back(slot);
    }

    return schedule;
}

// Generate initial timetable
json generateTimetable(string excel_file, int num_slots, int capacity)
{
    slots = num_slots;
    days = slots / 2;

    // Reset global variables
    course.clear();
    courseNumber.clear();
    numberCourse.clear();
    studentCourse.clear();
    bestSchedule.clear();

    // Initialize vectors with proper sizes

    // Construct the command to run the Python script with arguments
    string json_file = "output.json";
    string command = "python3 ../convertExcelToJSON.py ./uploads/" + excel_file + " " + json_file;
    int result = system(command.c_str());

    // Open the JSON file
    ifstream f("output.json");
    if (!f.is_open())
    {
        json error;
        error["status"] = "error";
        error["message"] = "Could not open JSON file";
        return error;
    }

    // Parse the JSON data
    json data = json::parse(f);
    // Map to store the JSON key-value pairs
    for (json::iterator it = data.begin(); it != data.end(); ++it)
    {
        string key = it.key(); // Extract the key
        if (key == "SR")
            continue;
        vector<string> values;

        // If the value is an array, convert elements to strings
        if (it.value().is_array())
        {
            for (const auto &element : it.value())
            {
                if (element.is_string())
                {
                    values.push_back(element.get<string>());
                }
                else
                {
                    values.push_back(element.dump()); // Serialize non-string values
                }
            }
        }
        else if (it.value().is_string())
        {
            // If the value is a single string
            values.push_back(it.value().get<string>());
        }
        else
        {
            // For other types (e.g., number, boolean), serialize to string
            values.push_back(it.value().dump());
        }
        course[key] = values;
    }

    int totalExams = 0;
    for (auto &i : course)
    {
        totalExams += i.second.size();
    }

    // GRAPH GENERATION
    courseCnt = course.size();
    // No need for memset, we initialized with zeros in the resize call
    adj.clear();
    adj.resize(courseCnt + 1, vector<int>(courseCnt + 1, 0));
    clash.clear();
    clash.resize(courseCnt + 1, vector<int>(courseCnt + 1, 0));
    courseCount.clear();
    courseCount.resize(courseCnt + 1, 0);

    // Course to number mapping
    int counter = 1;
    for (auto &i : course)
    {
        courseNumber[i.first] = counter;
        numberCourse[counter] = i.first;
        courseCount[counter] = i.second.size();
        counter++;
    }

    // Student to course mapping
    for (auto &i : course)
    {
        int num = courseNumber[i.first];
        for (auto &j : i.second)
        {
            studentCourse[j].push_back(num);
        }
    }

    // Reset the adj and clash matrices (already initialized to zero)

    // Adding edges, Edges refer to clash between two courses
    for (auto &studentPair : studentCourse)
    {
        int sze = studentPair.second.size();
        for (int j = 0; j < sze; j++)
        {
            for (int k = 0; k < sze; k++)
            {
                adj[studentPair.second[j]][studentPair.second[k]] = 1;
                clash[studentPair.second[j]][studentPair.second[k]]++;
            }
        }
    }
    cout << "Helloooo\n";

    // Adjacency list
    vector<vector<int>> graph(courseCnt + 1);
    for (int i = 1; i <= courseCnt; i++)
    {
        for (int j = 1; j <= courseCnt; j++)
        {
            if (adj[i][j])
            {
                graph[i].push_back(j);
            }
        }
    }

    // Minimum paritioning cliques
    vector<vector<vector<int>>> cliques;

    int minSlots = INT_MAX;
    for (int str = 1; str <= courseCnt; str++)
    {

        // DSATUR algorithm of graph colouring
        priority_queue<pair<pair<int, int>, int>> pq;
        pq.push({{0, 0}, str});
        set<int> undone;
        for (int i = 1; i <= courseCnt; i++)
        {
            undone.insert(i);
        }
        vector<int> colour(courseCnt + 1, 0); // Changed from fixed array
        vector<int> vis(courseCnt + 1, 0);    // Changed from fixed array

        while (!pq.empty())
        {
            int ver = pq.top().second;
            pq.pop();
            if (pq.empty() && !undone.empty())
            {
                pq.push({{0, 0}, *undone.begin()});
                undone.erase(undone.begin());
            }
            if (vis[ver])
                continue;
            vis[ver] = 1;
            vector<int> v;

            for (auto &i : graph[ver])
            {
                if (colour[i])
                {
                    v.push_back(colour[i]);
                    continue;
                }
                int sat = 0, deg = graph[i].size();
                for (auto &j : graph[i])
                {
                    if (colour[j] > 0)
                        sat++;
                }
                pq.push({{sat, deg}, i});
            }

            sort(v.begin(), v.end());
            int mex = 1;
            for (auto &i : v)
            {
                if (mex == i)
                    mex++;
            }
            colour[ver] = mex;
            undone.erase(ver);
        }

        int maxColour = 0;
        for (int i = 1; i <= courseCnt; i++)
        {
            maxColour = max(maxColour, colour[i]);
        }

        vector<vector<int>> tempCliques(maxColour);
        for (int j = 1; j <= courseCnt; j++)
        {
            tempCliques[colour[j] - 1].push_back(j);
        }
        int singleAssign = 0, F = 0;
        for (auto &i : tempCliques)
        {
            int total = 0;
            for (auto &j : i)
            {
                total += courseCount[j];
            }
            if (total > capacity)
            {
                F = 1;
                singleAssign++;
                for (int k = 0; k < 250; k++)
                {
                    shuffle(i.begin(), i.end(), gen);
                    int sum = 0;
                    for (auto &j : i)
                    {
                        sum += courseCount[j];
                        if (sum <= capacity && total - sum <= capacity)
                            F = 0;
                        if (F == 0)
                            break;
                    }
                    if (F == 0)
                        break;
                }
                if (F == 1)
                    break;
            }
        }

        // Single Assign refers to cliques which cannot be split into two slots
        //  F == 0 means good to go
        if (singleAssign <= slots - maxColour && F == 0)
        {
            if (maxColour < minSlots)
            {
                cliques.clear();
                minSlots = maxColour;
            }

            if (maxColour == minSlots)
            {
                cliques.push_back(tempCliques);
            }
        }
    }

    if (cliques.size() == 0)
    {
        json error;
        error["status"] = "error";
        error["message"] = "No possible schedule";
        return error;
    }

    pair<int, int> minValue = {INT_MAX, INT_MAX};

    for (auto &c : cliques)
    {
        vector<int> cliqueCount(c.size(), 0);
        for (int i = 0; i < c.size(); i++)
        {
            for (auto &j : c[i])
            {
                cliqueCount[i] += courseCount[j];
            }
        }

        // Sorting the cliques with respect to their sizes
        for (int k = 0; k <= c.size(); k++)
        {
            for (int i = 1; i < c.size(); i++)
            {
                if (cliqueCount[i] > cliqueCount[i - 1])
                {
                    swap(cliqueCount[i], cliqueCount[i - 1]);
                    swap(c[i], c[i - 1]);
                }
            }
        }

        // Num refers to number of cliques assigned to single slots
        int num = 2 * minSlots - slots;
        int maxMask = (1 << num) - 1;
        vector<int> order;
        for (int i = slots - minSlots; i < minSlots; i++)
        {
            order.push_back(i);
        }

        // Number of cases of two exams on same day for each pair of cliques
        vector<vector<int>> clashCount(minSlots + 1, vector<int>(minSlots + 1, 0));
        for (int i = 0; i < minSlots; i++)
        {
            for (int j = 0; j < minSlots; j++)
            {
                int sum = 0;
                for (auto &p : c[i])
                {
                    for (auto &q : c[j])
                    {
                        sum += clash[p][q];
                    }
                }
                clashCount[i][j] = sum;
            }
        }

        // Initialize dp and parent matrices for this iteration
        dp.assign(minSlots + 1, vector<int>(maxMask + 1, -1));
        parent.assign(minSlots + 1, vector<pair<int, int>>(maxMask + 1));

        // Dp with bitmasks
        int ans = func(minSlots, maxMask, num, clashCount, order);

        // Order of cliques which gives minimum clash2 value
        vector<int> bestOrder;
        int mask = maxMask, cur = minSlots;
        while (mask > 0)
        {
            pair<int, int> p = parent[cur][mask];
            cur = p.first;
            mask = p.second;
            bestOrder.push_back(cur);
        }

        // Finding best Final Schedule
        vector<vector<int>> schedule(slots);
        vector<int> gap;
        int segments = slots - minSlots + 1;
        int remaining = days - segments + 1;

        // Most optimal gap distribution
        // Gap refers to space between double slot cliques
        while (segments > 0)
        {
            int val = (remaining + segments - 1) / segments;
            gap.push_back(val);
            remaining -= val;
            segments--;
        }
        gap.pop_back();
        int pos = -2, idx = 0;
        for (auto &i : gap)
        {
            pos += (i + 1) * 2;
            vector<int> a, b;
            int total = 0, sum = 0;
            int sze = c[idx].size();
            int diff = INT_MAX;
            for (auto &j : c[idx])
            {
                total += courseCount[j];
            }

            // Even distribution of a clique in two slots
            for (int k = 0; k < 100; k++)
            {
                shuffle(c[idx].begin(), c[idx].end(), gen);
                int val = -1;
                sum = 0;
                for (int j = 0; j < c[idx].size(); j++)
                {
                    sum += courseCount[c[idx][j]];
                    if (sum <= capacity && total - sum <= capacity && diff > abs(2 * sum - total))
                    {
                        diff = abs(2 * sum - total);
                        val = j;
                    }
                }
                if (val == -1)
                    continue;
                a.clear();
                b.clear();
                for (int j = 0; j <= val; j++)
                {
                    a.push_back(c[idx][j]);
                }
                for (int j = val + 1; j < sze; j++)
                {
                    b.push_back(c[idx][j]);
                }
            }
            schedule[pos] = a;
            schedule[pos + 1] = b;
            idx++;
        }

        vector<int> perm;
        for (int i = 0; i < slots; i += 2)
        {
            if (schedule[i].empty())
            {
                perm.push_back(i);
            }
        }

        // Trying randomised permutations of single slot cliques to minimize clash4 value
        for (int k = 0; k < 100; k++)
        {
            int idx = 0;
            shuffle(perm.begin(), perm.end(), gen);
            for (auto &i : perm)
            {
                schedule[i] = c[bestOrder[idx]];
                schedule[i + 1] = c[bestOrder[idx + 1]];
                idx += 2;
            }
            unordered_map<int, int> courseClique;
            for (int i = 0; i < slots; i++)
            {
                for (auto &j : schedule[i])
                {
                    courseClique[j] = i;
                }
            }
            int clash2 = 0, clash4 = 0;
            for (auto &studentPair : studentCourse)
            {
                vector<int> v;
                for (auto &j : studentPair.second)
                {
                    v.push_back(courseClique[j]);
                }
                sort(v.begin(), v.end());
                int sze = v.size();
                for (int j = 1; j < sze; j++)
                {
                    if (v[j] % 2 == 1 && v[j] == v[j - 1] + 1)
                        clash2++;
                }
                for (int j = 3; j < sze; j++)
                {
                    if (v[j] % 2 == 1 && v[j] == v[j - 3] + 3)
                        clash4++;
                }
            }
            pair<int, int> temp = {clash2, clash4};
            if (temp < minValue)
            {
                minValue = temp;
                bestSchedule = schedule;
            }
        }
    }

    // Prepare the response
    json response;
    response["status"] = "success";
    response["min_slots"] = minSlots;
    response["schedule"] = formatSchedule();
    response["clashes"] = calculateClashes();

    return response;
}

// Swap elements in the timetable
json swapTimetable(int swap_type, const json &params)
{
    if (bestSchedule.empty())
    {
        json error;
        error["status"] = "error";
        error["message"] = "No schedule has been generated yet";
        return error;
    }

    // Type 1: Change course slot
    if (swap_type == 1)
    {
        string courseName = params["course"].get<string>();

        if (courseNumber.find(courseName) == courseNumber.end())
        {
            json error;
            error["status"] = "error";
            error["message"] = "Invalid course name";
            return error;
        }

        int num = courseNumber[courseName];
        vector<int> positions;
        int curSlot = -1;

        for (int i = 0; i < slots; i++)
        {
            int F = 1;
            for (auto j : bestSchedule[i])
            {
                if (adj[num][j])
                    F = 0;
                if (j == num)
                    curSlot = i;
            }
            if (F && i != curSlot)
                positions.push_back(i);
        }

        if (positions.empty())
        {
            json error;
            error["status"] = "error";
            error["message"] = "No possible slots available for this course";
            return error;
        }

        // Get the new slot from params
        int newSlot = params["new_slot"].get<int>() - 1;

        // Check if newSlot is valid
        bool valid = false;
        for (auto pos : positions)
        {
            if (pos == newSlot)
            {
                valid = true;
                break;
            }
        }

        if (!valid)
        {
            json error;
            error["status"] = "error";
            error["message"] = "Invalid new slot";
            return error;
        }

        vector<int> temp;
        for (auto i : bestSchedule[curSlot])
        {
            if (i == num)
                continue;
            temp.push_back(i);
        }
        bestSchedule[curSlot] = temp;
        bestSchedule[newSlot].push_back(num);
    }
    // Type 2: Swap slots
    else if (swap_type == 2)
    {
        int slot1 = params["slot1"].get<int>();
        int slot2 = params["slot2"].get<int>();

        if (slot1 < 1 || slot1 > slots || slot2 < 1 || slot2 > slots)
        {
            json error;
            error["status"] = "error";
            error["message"] = "Invalid slot numbers";
            return error;
        }

        swap(bestSchedule[slot1 - 1], bestSchedule[slot2 - 1]);
    }
    // Type 3: Swap days
    else if (swap_type == 3)
    {
        int day1 = params["day1"].get<int>();
        int day2 = params["day2"].get<int>();

        if (day1 < 1 || day1 > days || day2 < 1 || day2 > days)
        {
            json error;
            error["status"] = "error";
            error["message"] = "Invalid day numbers";
            return error;
        }

        int idx1 = (day1 - 1) * 2;
        int idx2 = (day2 - 1) * 2;
        swap(bestSchedule[idx1], bestSchedule[idx2]);
        swap(bestSchedule[idx1 + 1], bestSchedule[idx2 + 1]);
    }
    else
    {
        json error;
        error["status"] = "error";
        error["message"] = "Invalid swap type";
        return error;
    }

    // Prepare the response
    json response;
    response["status"] = "success";
    response["schedule"] = formatSchedule();
    response["clashes"] = calculateClashes();

    return response;
}

// Helper function to list available positions for a course
json getAvailablePositions(const string &courseName)
{
    if (courseNumber.find(courseName) == courseNumber.end())
    {
        json error;
        error["status"] = "error";
        error["message"] = "Invalid course name";
        return error;
    }

    int num = courseNumber[courseName];
    vector<int> positions;
    int curSlot = -1;

    for (int i = 0; i < slots; i++)
    {
        int F = 1;
        for (auto j : bestSchedule[i])
        {
            if (adj[num][j])
                F = 0;
            if (j == num)
                curSlot = i;
        }
        if (F && i != curSlot)
            positions.push_back(i + 1); // Adding 1 to convert to 1-indexed slots
    }

    json response;
    response["status"] = "success";
    response["course"] = courseName;
    response["current_slot"] = curSlot + 1; // Adding 1 to convert to 1-indexed slots
    response["available_slots"] = positions;

    return response;
}

struct CORS
{
    struct context
    {
    };

    void before_handle(crow::request &req, crow::response &res, context &)
    {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");

        if (req.method == crow::HTTPMethod::Options)
        {
            res.code = 204;
            res.end();
        }
    }

    void after_handle(crow::request &, crow::response &res, context &)
    {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
    }
};

int main()
{
    crow::App<CORS> app;

    // === /generate ===
    CROW_ROUTE(app, "/generate")
        .methods("POST"_method)([](const crow::request &req)
                                {
            crow::response res;

            try {
                json body = json::parse(req.body);
                string excelFile = body["excel_file"].get<string>();
                int numSlots = body["slots"].get<int>();
                int capacity = body["capacity"].get<int>();

                cout << excelFile << " " << numSlots << " " << capacity << "\n";

                json result = generateTimetable(excelFile, numSlots, capacity);
                res.write(result.dump(4));
                res.code = 200;
            } catch (const exception& e) {
                json error;
                error["status"] = "error";
                error["message"] = string("Error processing request: ") + e.what();
                res.write(error.dump(4));
                res.code = 400;
            }

            res.set_header("Content-Type", "application/json");
            return res; });

    // === /swap ===
    CROW_ROUTE(app, "/swap")
        .methods("POST"_method)([](const crow::request &req)
                                {
            crow::response res;

            try {
                json body = json::parse(req.body);
                int swapType = body["swap_type"].get<int>();
                json params = body["params"];

                json result = swapTimetable(swapType, params);
                res.write(result.dump(4));
                res.code = 200;
            } catch (const exception& e) {
                json error;
                error["status"] = "error";
                error["message"] = string("Error processing request: ") + e.what();
                res.write(error.dump(4));
                res.code = 400;
            }

            res.set_header("Content-Type", "application/json");
            return res; });

    // === /available_positions ===
    CROW_ROUTE(app, "/available_positions")
        .methods("POST"_method)([](const crow::request &req)
                                {
            crow::response res;

            try {
                json body = json::parse(req.body);
                string courseName = body["course"].get<string>();

                json result = getAvailablePositions(courseName);
                res.write(result.dump(4));
                res.code = 200;
            } catch (const exception& e) {
                json error;
                error["status"] = "error";
                error["message"] = string("Error processing request: ") + e.what();
                res.write(error.dump(4));
                res.code = 400;
            }

            res.set_header("Content-Type", "application/json");
            return res; });

    // === /upload ===
    CROW_ROUTE(app, "/upload")
        .methods("POST"_method)([](const crow::request &req)
                                {
    crow::response res;
    
    try {
        // Get content type and boundary
        std::string contentType = req.get_header_value("Content-Type");
        size_t boundaryPos = contentType.find("boundary=");
        if (boundaryPos == std::string::npos) {
            throw std::runtime_error("No boundary found in Content-Type");
        }
        
        std::string boundary = contentType.substr(boundaryPos + 9); // +9 for "boundary="
        std::string delimiter = "--" + boundary;
        std::string closeDelimiter = "--" + boundary + "--";
        
        // Create a unique filename
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()).count();
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(1000, 9999);
        int random_num = dis(gen);
        
        std::string filename = "upload_" + std::to_string(timestamp) + "_" + std::to_string(random_num) + ".xlsx";
        std::string filepath = "uploads/" + filename;
        
        // Ensure the uploads directory exists
        std::filesystem::create_directories("uploads");
        
        // Parse multipart form data to extract file content
        const std::string& body = req.body;
        
        // Find the beginning of the file data
        size_t fileStart = body.find("\r\n\r\n", body.find(delimiter));
        if (fileStart == std::string::npos) {
            throw std::runtime_error("Could not find file content start");
        }
        fileStart += 4; // Move past "\r\n\r\n"
        
        // Find the end boundary
        size_t fileEnd = body.find(delimiter, fileStart);
        if (fileEnd == std::string::npos) {
            throw std::runtime_error("Could not find file content end");
        }
        fileEnd -= 2; // Account for "\r\n" before the delimiter
        
        // Extract file content
        std::string fileContent = body.substr(fileStart, fileEnd - fileStart);
        
        // Write file content
        std::ofstream file(filepath, std::ios::binary);
        if (!file) {
            throw std::runtime_error("Failed to create file");
        }
        file.write(fileContent.data(), fileContent.size());
        file.close();
        
        // Return the filename
        json result;
        result["status"] = "success";
        result["filename"] = filename;
        res.write(result.dump(4));
        res.code = 200;
    } catch (const std::exception& e) {
        json error;
        error["status"] = "error";
        error["message"] = std::string("Error uploading file: ") + e.what();
        res.write(error.dump(4));
        res.code = 400;
    }
    
    res.set_header("Content-Type", "application/json");
    return res; });

    // Start server
    app.port(3000).multithreaded().run();

    return 0;
}
