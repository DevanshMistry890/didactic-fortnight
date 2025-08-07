// Main dashboard functionality
async function fetchData() {
    try {
        // Show loading states
        document.querySelectorAll('.loading-spinner').forEach(el => {
            el.style.display = 'flex';
        });

        // Fetch COVID-19 data
        const historicalResponse = await fetch('https://disease.sh/v3/covid-19/historical/all?lastdays=500');
        const historicalData = await historicalResponse.json();

        // Fetch vaccine data (simulated since API doesn't provide historical vaccine data)
        const vaccineData = generateVaccineData();

        return processData(historicalData, vaccineData);
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function generateVaccineData() {
    // Simulate realistic vaccination data
    const data = [];
    let totalVaccinated = 1000000;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // Simulate some variability in daily vaccinations
        const dailyVaccinations = Math.floor(Math.random() * 50000) + 20000;
        totalVaccinated += dailyVaccinations;

        data.push({
            date: date,
            total: totalVaccinated,
            daily: dailyVaccinations,
            formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }
    return data;
}

function processData(rawData, vaccineData) {
    // Process cases data
    const casesData = Object.entries(rawData.cases).map(([date, value]) => ({
        date: new Date(date),
        cases: value,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    // Process deaths data
    const deathsData = Object.entries(rawData.deaths).map(([date, value]) => ({
        date: new Date(date),
        deaths: value,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    // Calculate daily changes
    const calculateDailyChanges = (data, key) => data.map((item, index) => ({
        ...item,
        [`daily_${key}`]: index === 0 ? 0 : item[key] - data[index - 1][key]
    }));

    const dailyCases = calculateDailyChanges(casesData, 'cases');
    const dailyDeaths = calculateDailyChanges(deathsData, 'deaths');

    return {
        cumulative: { cases: casesData, deaths: deathsData },
        daily: { cases: dailyCases, deaths: dailyDeaths },
        vaccine: vaccineData
    };
}

function createBarChart(data) {
    const container = document.getElementById('barChart');
    if (!container) return;

    const dailyCases = data.daily.cases.slice(-30);
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select("#barChart").html("");

    const svg = d3.select("#barChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 40)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
        .domain(dailyCases.map(d => d.formattedDate))
        .range([0, width])
        .padding(0.2);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(dailyCases, d => d.daily_cases) * 1.1])
        .nice()
        .range([height, 0]);

    // Color scale
    const color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, dailyCases.length - 1]);

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""));

    // Add X axis with proper spacing for rotated labels
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add Y axis without top line
    svg.append("g")
        .call(d3.axisLeft(y).tickSizeOuter(0));

    // Add X axis label (below the rotated dates)
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Date");

    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");

    // Add bars with animation
    svg.selectAll(".bar")
        .data(dailyCases)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.formattedDate))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", (d, i) => color(i))
        .attr("rx", 3)
        .attr("ry", 3)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.8);

            const tooltip = d3.select("#tooltip");
            tooltip.html(`
                <strong>${d.formattedDate}</strong>
                <div>New Cases: ${d.daily_cases.toLocaleString()}</div>
                <div>7-Day Avg: ${calculate7DayAvg(dailyCases, dailyCases.indexOf(d), "daily_cases").toLocaleString()}</div>
            `)
                .style("opacity", 1)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .attr("y", d => y(d.daily_cases))
        .attr("height", d => height - y(d.daily_cases));

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Daily New Cases");

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${height + 40})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "#3c6fdc");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .text("Number of Daily Cases")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");
}

function createCaseFatalityChart(data) {
    const container = document.getElementById('caseFatalityChart');
    if (!container) return;

    const dailyData = data.daily.cases.map((d, i) => ({
        date: d.date,
        formattedDate: d.formattedDate,
        newCases: d.daily_cases,
        newDeaths: data.daily.deaths[i].daily_deaths,
        fatalityRate: data.daily.deaths[i].daily_deaths > 0 && d.daily_cases > 0 ?
            (data.daily.deaths[i].daily_deaths / d.daily_cases) * 100 : 0
    })).filter(d => d.newCases > 0).slice(-30);

    const margin = { top: 40, right: 30, bottom: 100, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select("#caseFatalityChart").html("");

    const svg = d3.select("#caseFatalityChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
        .domain([0, d3.max(dailyData, d => d.newCases) * 1.1])
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(dailyData, d => d.fatalityRate) * 1.1])
        .nice()
        .range([height, 0]);

    // Size scale
    const size = d3.scaleSqrt()
        .domain([0, d3.max(dailyData, d => d.newDeaths)])
        .range([5, 30]);

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat(""));

    // Add X axis without top line
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // Add Y axis without right line
    svg.append("g")
        .call(d3.axisLeft(y).tickSizeOuter(0));

    svg.selectAll(".bubble")
        .data(dailyData)
        .enter().append("circle")
        .attr("class", d => {
            if (d.fatalityRate > 5) return "bubble bubble-high";
            if (d.fatalityRate > 2) return "bubble bubble-medium";
            return "bubble bubble-low";
        })
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .attr("r", 0)
        .attr("opacity", 0.8)
        .attr("stroke-width", 1.5)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke-width", 2);

            const tooltip = d3.select("#tooltip");
            tooltip.html(`
                <strong>${d.formattedDate}</strong>
                <div>New Cases: ${d.newCases.toLocaleString()}</div>
                <div>New Deaths: ${d.newDeaths.toLocaleString()}</div>
                <div>Fatality Rate: ${d.fatalityRate.toFixed(2)}%</div>
            `)
                .style("opacity", 1)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("stroke-width", 1.5);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr("cx", d => x(d.newCases))
        .attr("cy", d => y(d.fatalityRate))
        .attr("r", d => size(d.newDeaths));

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Case Fatality Rate Analysis");

    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Number of New Cases");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Fatality Rate (%)");

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${height + 70})`);

    // Color legend
    const colorLegendData = [
        { label: "High Fatality (>5%)", class: "bubble-high" },
        { label: "Medium Fatality (2-5%)", class: "bubble-medium" },
        { label: "Low Fatality (<2%)", class: "bubble-low" }
    ];

    colorLegendData.forEach((item, i) => {
        const g = legend.append("g")
            .attr("transform", `translate(${i * 150}, 0)`);

        g.append("circle")
            .attr("r", 6)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("class", item.class);

        g.append("text")
            .attr("x", 15)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .text(item.label)
            .style("font-size", "10px")
            .style("fill", "var(--text-color)");
    });
}

function createLineChart(data) {
    const container = document.getElementById('lineChart');
    if (!container) return;

    const dailyCases = data.daily.cases;
    const margin = { top: 40, right: 50, bottom: 60, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select("#lineChart").html("");

    const svg = d3.select("#lineChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 30)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Aggregate data by week (last 8 weeks)
    const weeklyData = [];
    const startIndex = Math.max(0, dailyCases.length - 56);
    for (let i = startIndex; i < dailyCases.length; i += 7) {
        const weekCases = dailyCases.slice(i, Math.min(i + 7, dailyCases.length)).reduce((sum, d) => sum + d.daily_cases, 0);
        weeklyData.push({
            week: Math.floor((i - startIndex) / 7) + 1,
            cases: weekCases,
            label: `Week ${Math.floor((i - startIndex) / 7) + 1}`
        });
    }

    // X scale
    const x = d3.scaleBand()
        .domain(weeklyData.map(d => d.label))
        .range([0, width])
        .padding(0.2);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(weeklyData, d => d.cases)])
        .nice()
        .range([height, 0]);

    // Line generator
    const line = d3.line()
        .x(d => x(d.label) + x.bandwidth() / 2)
        .y(d => y(d.cases))
        .curve(d3.curveMonotoneX);

    // Add Y axis with improved formatting and no top line
    const yAxis = d3.axisLeft(y)
        .ticks(6)
        .tickFormat(d => {
            if (d >= 1000000) return `${(d/1000000).toFixed(1)}M`;
            if (d >= 1000) return `${(d/1000).toFixed(0)}k`;
            return d;
        })
        .tickSizeOuter(0);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .selectAll(".tick text")
        .style("font-size", "12px")
        .style("fill", "var(--axis-color)");

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""));

    // Add line path
    svg.append("path")
        .datum(weeklyData)
        .attr("fill", "none")
        .attr("stroke", "#3c6fdc")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", function() { return this.getTotalLength() })
        .attr("stroke-dashoffset", function() { return this.getTotalLength() })
        .attr("d", line)
        .transition()
        .duration(1500)
        .attr("stroke-dashoffset", 0);

    // Add dots
    svg.selectAll(".dot")
        .data(weeklyData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.label) + x.bandwidth() / 2)
        .attr("cy", height)
        .attr("r", 0)
        .attr("fill", "#3c6fdc")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 6);

            const tooltip = d3.select("#tooltip");
            tooltip.html(`
                <strong>${d.label}</strong>
                <div>Total Cases: ${d.cases.toLocaleString()}</div>
                <div>Avg Daily: ${Math.round(d.cases / 7).toLocaleString()}</div>
            `)
                .style("opacity", 1)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 150)
        .attr("cy", d => y(d.cases))
        .attr("r", 4);

    // Add X axis without top line
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll(".tick text")
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(d => `WEEK ${d.split(" ")[1]}`);

    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Week Number");

    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Total Number of Cases");

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Weekly Case Trends");

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${height + 40})`);

    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#3c6fdc")
        .attr("stroke-width", 2);

    legend.append("circle")
        .attr("cx", 50)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", "#3c6fdc");

    legend.append("text")
        .attr("x", 70)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text("Weekly COVID-19 Cases")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");
}

function createStackedBarChart(data) {
    const container = document.getElementById('stackedBarChart');
    if (!container) return;

    const vaccineData = data.vaccine;
    const margin = { top: 40, right: 30, bottom: 80, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select("#stackedBarChart").html("");

    const svg = d3.select("#stackedBarChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
        .domain(vaccineData.map(d => d.formattedDate))
        .range([0, width])
        .padding(0.2);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, 100000])
        .nice()
        .range([height, 0]);

    // Add bars
    svg.selectAll(".bar")
        .data(vaccineData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.formattedDate))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", "#00b894")
        .attr("rx", 3)
        .attr("ry", 3)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.8);

            const tooltip = d3.select("#tooltip");
            tooltip.html(`
                <strong>${d.formattedDate}</strong>
                <div>Vaccinated: ${d.daily.toLocaleString()}</div>
                <div>Progress: ${((d.daily / 100000) * 100).toFixed(1)}% of target</div>
            `)
                .style("opacity", 1)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .attr("y", d => y(d.daily))
        .attr("height", d => height - y(d.daily));

    // Add X axis without top line
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add Y axis without top line
    svg.append("g")
        .call(d3.axisLeft(y).tickSizeOuter(0));

    // Add target line
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(100000))
        .attr("y2", y(100000))
        .attr("stroke", "#f72585")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Daily Vaccination Progress");

    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)")
        .text("Date");

    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${height + 50})`);

    // Vaccination bars legend
    legend.append("rect")
        .attr("x", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "#00b894");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .text("Number of Vaccinations on Daily")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");

    // Target line legend
    legend.append("line")
        .attr("x1", width / 2)
        .attr("x2", width / 2 + 20)
        .attr("y1", 6)
        .attr("y2", 6)
        .attr("stroke", "#f72585")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");

    legend.append("text")
        .attr("x", width / 2 + 30)
        .attr("y", 10)
        .text("Daily Target (100,000)")
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");
}

function calculate7DayAvg(data, index, key) {
    const start = Math.max(0, index - 6);
    const subset = data.slice(start, index + 1);
    const sum = subset.reduce((acc, d) => acc + d[key], 0);
    return sum / subset.length;
}

async function drawAllCharts() {
    const data = await fetchData();
    if (!data) {
        alert("Failed to load data. Please try again later.");
        return;
    }

    createBarChart(data);
    createCaseFatalityChart(data);
    createLineChart(data);
    createStackedBarChart(data);

    // Hide loading spinners
    document.querySelectorAll('.loading-spinner').forEach(el => {
        el.style.display = 'none';
    });
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Set up dark mode toggle if element exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('dark-mode');
            const icon = this.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
            // Redraw charts to update colors
            drawAllCharts();
        });
    }

    // Set up refresh button if element exists
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            const icon = this.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            drawAllCharts().finally(() => {
                if (icon) icon.classList.remove('fa-spin');
            });
        });
    }

    // Initial load
    drawAllCharts();

    // Handle window resize
    window.addEventListener('resize', function () {
        drawAllCharts();
    });
});
