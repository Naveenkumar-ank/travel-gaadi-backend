// app.js
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const Tesseract = require("tesseract.js");

const app = express();

const port = 3000;
app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/api/v1/CaptchaConfig", async (req, res) => {
  try {
    const apiUrl = `https://www.indianrail.gov.in/enquiry/CaptchaConfig?_=${new Date().getTime()}`; // Example API URL
    const response = await axios.get(apiUrl);
    if (response.data != 0) {
      const res1 = await axios.get(
        `https://www.indianrail.gov.in/enquiry/captchaDraw.png?${new Date().getTime()}`
      );
      res.json(res1.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error("Error calling the API:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/api/v1/get-captcha-value", async (req, res) => {
  try {
    const response = await getCaptchaValue();
    res.json(response);
  } catch (error) {
    res.json(error);
  }
});

async function getCaptchaValue() {
  try {
    const captchaTime = new Date().getTime();
    const imageUrl = `https://www.indianrail.gov.in/enquiry/captchaDraw.png?${captchaTime}`;
    // Fetch image with responseType as 'arraybuffer'
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: { "Accept-Encoding": "gzip, deflate" },
    });
    const imageBuffer = Buffer.from(response.data, "binary");
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");
    let sum = extractVariablesFromText(text);
    sum.result = performMath(sum);
    sum.captchaTime = captchaTime;
    return sum;
  } catch (error) {
    console.log("captcha fetching error", error);
    return null;
  }
}

function performMath({ v1, operator, v2 }) {
  let result;

  switch (operator) {
    case "+":
      result = v1 + v2;
      break;
    case "-":
      result = v1 - v2;
      break;
    case "*":
      result = v1 * v2;
      break;
    case "/":
      result = v1 / v2;
      break;
    default:
      result = null;
      break;
  }

  return result;
}

function extractVariablesFromText(text) {
  // Trim input to remove unwanted spaces or newline characters
  const trimmedText = text.trim();
  // Match the format "v1 operator v2 = result"
  const regex = /^(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=\s*(.+)$/;
  const match = trimmedText.match(regex);
  if (match) {
    const v1 = parseInt(match[1], 10); // Extract first number
    const operator = match[2]; // Extract operator (+, -, *, /)
    const v2 = parseInt(match[3], 10); // Extract second number
    const result = match[4] === "?" ? null : parseInt(match[4], 10); // Extract result or mark as null
    return { v1, operator, v2, result };
  } else {
    return null;
  }
}

app.get("/api/v1/CaptchaDraw", async (req, res) => {
  try {
    const apiUrl = `https://www.indianrail.gov.in/enquiry/captchaDraw.png?${new Date().getTime()}`; // Example API URL
    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error calling the API:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/api/v1/fetch-captcha", async (req, res) => {
  try {
    const imageUrl = `https://www.indianrail.gov.in/enquiry/captchaDraw.png?${new Date().getTime()}`;
    // Fetch image with responseType as 'arraybuffer'
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: { "Accept-Encoding": "gzip, deflate" },
    });
    // Set proper headers for image response
    res.set("Content-Type", "image/png"); // For PNG images
    res.set("Content-Length", response.data.length); // Set the length of the image data
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

app.get("/api/v1/get-train-live-status", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      `https://www.railyatri.in/live-train-status/${req.query.trainNo}`
    );
    const $ = cheerio.load(html);
    const output = $("#__NEXT_DATA__").text();
    res.json(JSON.parse(output));
  } catch (error) {
    res.json(error);
  }
});

app.get("/api/v2/get-train-live-status", async (req, res) => {
  try {
    const response = await axios.get(
      `https://www.redbus.in/railways/api/getLtsDetails?trainNo=${req.query.trainNo}`
    );
    res.json(response.data);
  } catch (error) {
    res.json(error);
  }
});

app.get("/api/v1/get-train-time-table", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      `https://www.railyatri.in/time-table/${req.query.trainNo}`
    );
    const $ = cheerio.load(html);
    const output = $("#__NEXT_DATA__").text();
    res.json(JSON.parse(output));
  } catch (error) {
    res.json(error);
  }
});

app.get("/api/v1/get-pnr-status", async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append("pnrno", req.query.pnrNumber);

    console.log("Params:", params.toString()); // Display query string

    // Make the GET request with params
    const response = await axios.get(
      "https://www.redbus.in/railways/api/getPnrData",
      { params }
    );
    res.json(response.data);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ message: "Error occurred", error: error.message });
  }
});

app.get("/api/v1/get-train-between-station", async (req, res) => {
  try {
    console.log(req.query);
    const params = new URLSearchParams();
    params.append("from", req.query.from);
    params.append("to", req.query.to);
    params.append("dateOfJourney", req.query.dateOfJourney);
    params.append("action", "train_betweeen_station");
    params.append("from_code", req.query.from_code);
    params.append("from_name", req.query.from_name);
    params.append("journey_date", req.query.journey_date);
    params.append("journey_quota", req.query.journey_quota);
    params.append("to_code", req.query.to_code);
    params.append("to_name", req.query.to_name);
    console.log(params);
    const apiUrl = `https://api.railyatri.in/api/trains-between-station-from-wrapper.json`; // Example API URL
    const response = await axios.get(apiUrl, { params });
    res.json(response.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

app.get("/api/v1/get-next-days-seat-availability", async (req, res) => {
  try {
    // console.log(req.query);
    const params = new URLSearchParams();
    params.append("train_number", req.query.train_number);
    params.append("check_urgency", false);
    params.append("journey_class", req.query.journey_class);
    params.append("from", req.query.from);
    params.append("to", req.query.to);
    params.append("journey_date", req.query.journey_date);
    params.append("journey_quota", req.query.journey_quota);

    params.append("train_start_date", req.query.train_start_date);
    params.append("train_source", req.query.train_source);
    params.append("train_destination", req.query.train_destination);
    params.append("boarding_from", req.query.boarding_from);
    params.append("boarding_from", req.query.boarding_to);

    const apiUrl = `https://www.railyatri.in/get-next-days-sa-data`;
    const response = await axios.get(apiUrl, { params: { ...req.query } });
    res.json(response.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

app.get("/api/v1/get-live-station-info", async (req, res) => {
  try {
    const apiUrl = `https://erail.in/station-live/${req.query.stationCode}`;
    const { data: html } = await axios.get(apiUrl);
    const $ = cheerio.load(html);
    $("table.StationLive tr").each((index, element) => {
      if (index === 0) return;
      const trainNameFull = $(element).find("td div.name").text().trim();
      const match = trainNameFull.match(/^(\d+)\s+(.+)/);
      const trainNumber = match ? match[1] : null;
      const trainName = match ? match[2] : null;
      const trainDetails = $(element).find("td div.font80.stns").text().trim();
      const trainTime = $(element).find("td.greenLink").text().trim();
      let fromStation = [];
      let toStation = [];
      if (trainDetails) {
        const stations = trainDetails.split(" → ")[0];
        fromStation = stations[0] ?? "";
        toStation = stations[1] ?? "";
      }
      const trains = [];
      if (trainName && trainTime) {
        trains.push({
          trainName,
          trainNumber,
          trainDetails,
          trainTime,
          fromStation,
          toStation,
        });
      }
    });
    res.json(trains);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

app.get("/api/v1/get-station-list", async (req, res) => {
  try {
    const apiUrl = `https://www.indianrail.gov.in/enquiry/FetchAutoComplete?_=${new Date().getTime()}`; // Example API URL
    const response = await axios.get(apiUrl);
    let _tempData = response.data || [];
    _tempData = _tempData.map((data) => {
      return {
        stationName: data.split("-")[0],
        stationCode: data.split("-")[1],
        station: data,
      };
    });
    res.json({
      success: true,
      length: _tempData.length || "",
      data: _tempData,
    });
  } catch (error) {
    console.error("Error calling the API:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
