// Main dashboard functionality
async function fetchData() {
    try {
        // Show loading states
        document.querySelectorAll('.loading-spinner').forEach(el => {
            el.style.display = 'flex';
        });

        // Fetch COVID-19 data
        const historicalResponse = await fetch('https://disease.sh/v3/covid-19/historical/all?lastdays=60');
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

    // Calculate KPIs
    const latest = dailyCases[dailyCases.length - 1];
    const weekAgo = dailyCases[dailyCases.length - 8];

    const totalCases = latest.cases;
    const totalDeaths = deathsData[deathsData.length - 1].deaths;

    // Calculate recovery rate (estimate if not available)
    let totalRecovered;
    if (rawData.recovered) {
        totalRecovered = Object.values(rawData.recovered).slice(-1)[0];
    } else {
        // Estimate recovery rate (80-95% of non-fatal cases)
        totalRecovered = Math.round((totalCases - totalDeaths) * 0.9);
    }

    const recoveryRate = (totalRecovered / totalCases) * 100;
    const fatalityRate = (totalDeaths / totalCases) * 100;
    const activeCases = totalCases - totalDeaths - totalRecovered;

    const casesChange = ((latest.cases - weekAgo.cases) / weekAgo.cases) * 100;
    const deathsChange = ((deathsData[deathsData.length - 1].deaths - deathsData[deathsData.length - 8].deaths) / deathsData[deathsData.length - 8].deaths) * 100;
    const recoveryChange = 1.2; // Sample positive change
    const fatalityChange = -0.5; // Sample negative change
    const activeChange = 2.5; // Sample change

    return {
        cumulative: { cases: casesData, deaths: deathsData, recovered: totalRecovered },
        daily: { cases: dailyCases, deaths: dailyDeaths },
        vaccine: vaccineData,
        kpis: {
            totalCases,
            totalDeaths,
            recoveryRate,
            fatalityRate,
            activeCases,
            casesChange,
            deathsChange,
            recoveryChange,
            fatalityChange,
            activeChange
        }
    };
}

function updateKPIs(kpis) {
    const totalCasesEl = document.getElementById('total-cases');
    const totalDeathsEl = document.getElementById('total-deaths');
    const fatalityRateEl = document.getElementById('fatality-rate');
    const activeCasesEl = document.getElementById('active-cases');
    const casesChangeEl = document.getElementById('cases-change');
    const deathsChangeEl = document.getElementById('deaths-change');
    const fatalityChangeEl = document.getElementById('fatality-change');
    const activeChangeEl = document.getElementById('active-change');

    if (totalCasesEl) totalCasesEl.textContent = kpis.totalCases.toLocaleString();
    if (totalDeathsEl) totalDeathsEl.textContent = kpis.totalDeaths.toLocaleString();
    if (fatalityRateEl) fatalityRateEl.textContent = kpis.fatalityRate.toFixed(2) + '%';
    if (activeCasesEl) activeCasesEl.textContent = kpis.activeCases.toLocaleString();

    if (casesChangeEl) casesChangeEl.innerHTML = `<i class="fas fa-arrow-${kpis.casesChange >= 0 ? 'up' : 'down'} me-1"></i> ${Math.abs(kpis.casesChange).toFixed(2)}%`;
    if (deathsChangeEl) deathsChangeEl.innerHTML = `<i class="fas fa-arrow-${kpis.deathsChange >= 0 ? 'up' : 'down'} me-1"></i> ${Math.abs(kpis.deathsChange).toFixed(2)}%`;
    if (fatalityChangeEl) fatalityChangeEl.innerHTML = `<i class="fas fa-arrow-${kpis.fatalityChange >= 0 ? 'up' : 'down'} me-1"></i> ${Math.abs(kpis.fatalityChange).toFixed(2)}%`;
    if (activeChangeEl) activeChangeEl.innerHTML = `<i class="fas fa-arrow-${kpis.activeChange >= 0 ? 'up' : 'down'} me-1"></i> ${Math.abs(kpis.activeChange).toFixed(2)}%`;
}

function createBarChart(data) {
    const container = document.getElementById('barChart');
    if (!container) return;

    const dailyCases = data.daily.cases.slice(-30);
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select("#barChart").html("");

    const svg = d3.select("#barChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
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

    // Color scale - using purple shades
    const color = d3.scaleOrdinal()
        .domain(dailyCases.map((d, i) => i))
        .range(dailyCases.map((d, i) => {
            // Create purple color variations
            const basePurple = 100;
            const variation = Math.floor((i % 5) * 30);
            return `rgb(${100 + variation}, ${80 + variation}, ${200 + variation})`;
        }));

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""));

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6));

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

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
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
        .range([3, 25]);

    // Color scale - green, orange, yellow
    const color = d3.scaleOrdinal()
        .domain(dailyData.map((d, i) => i))
        .range(dailyData.map((d, i) => {
            const colors = [
                'rgb(0, 184, 148)',    // green
                'rgb(253, 203, 110)',  // orange
                'rgb(255, 234, 167)'   // light yellow
            ];
            return colors[i % 3];
        }));

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

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add bubbles
    svg.selectAll(".bubble")
        .data(dailyData)
        .enter().append("circle")
        .attr("class", "bubble")
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .attr("r", 0)
        .attr("fill", (d, i) => color(i))
        .attr("opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke", "#333")
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
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr("cx", d => x(d.newCases))
        .attr("cy", d => y(d.fatalityRate))
        .attr("r", d => size(d.newDeaths));
}

function createLineChart(data) {
    const container = document.getElementById('lineChart');
    if (!container) return;

    const dailyCases = data.daily.cases;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    d3.select("#lineChart").html("");

    const svg = d3.select("#lineChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Aggregate data by week (last 8 weeks)
    const weeklyData = [];
    const startIndex = Math.max(0, dailyCases.length - 56); // 8 weeks of data
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

    // Line generator with different colors for segments
    const line = d3.line()
        .x(d => x(d.label) + x.bandwidth() / 2)
        .y(d => y(d.cases))
        .curve(d3.curveMonotoneX);

    // Add line path with gradient color
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "line-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#6c5ce7");

    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#00b894");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#fdcb6e");

    svg.append("path")
        .datum(weeklyData)
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", function () { return this.getTotalLength() })
        .attr("stroke-dashoffset", function () { return this.getTotalLength() })
        .attr("d", line)
        .transition()
        .duration(1500)
        .attr("stroke-dashoffset", 0);

    // Add dots with different colors
    svg.selectAll(".dot")
        .data(weeklyData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.label) + x.bandwidth() / 2)
        .attr("cy", height)
        .attr("r", 0)
        .attr("fill", (d, i) => {
            const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#d63031', '#a29bfe'];
            return colors[i % colors.length];
        })
        .on("mouseover", function (event, d) {
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
        .on("mouseout", function () {
            d3.select(this).attr("r", 4);
            d3.select("#tooltip").style("opacity", 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 150)
        .attr("cy", d => y(d.cases))
        .attr("r", 4);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));
}

function createStackedBarChart(data) {
    const container = document.getElementById('stackedBarChart');
    if (!container) return;

    const vaccineData = data.vaccine;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

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

    // Add bars with green shades
    svg.selectAll(".bar")
        .data(vaccineData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.formattedDate))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", (d, i) => {
            // Create blue color variations
            const baseBlue = 100;
            const variation = Math.floor((i % 5) * 30);
            return `rgb(${50 + variation}, ${120 + variation}, ${200 + variation})`;
        })
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

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add target line
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(100000))
        .attr("y2", y(100000))
        .attr("stroke", "#f72585")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");
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

    updateKPIs(data.kpis);
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
