// --- D3.js Spider Chart Visualization ---
(function () {
    // 1. Setup: Define dimensions and SVG container
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartContainer = document.getElementById('spider-chart');

    let width = chartContainer.clientWidth - margin.left - margin.right;
    let height = chartContainer.clientHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2.5; // Radius of the radar chart

    const svg = d3.select("#spider-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`); // Center the chart

    const tooltip = d3.select("#tooltip");
    const formatValue = d3.format(",.0f"); // Format original values for tooltip
    const formatNormalized = d3.format(".2f"); // Format normalized values

    // Define the valid date range for data
    const dataStartDate = new Date('2020-02-29');
    const dataEndDate = new Date('2022-06-17');

    // Helper function to safely parse a value to a number
    const safeParseNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // Metrics to compare on the radar chart
    const metrics = [
        { name: "Population", key: "population", higherIsBetter: true },
        { name: "Total Cases", key: "cumulative_confirmed", higherIsBetter: false },
        { name: "Total Deaths", key: "cumulative_deceased", higherIsBetter: false },
        { name: "GDP Per Capita", key: "gdp_per_capita_usd", higherIsBetter: true },
        { name: "Life Expectancy", key: "life_expectancy", higherIsBetter: true },
        { name: "Population Density", key: "population_density", higherIsBetter: false }
    ];

    // Color scale for countries - Defined at a higher scope
    const countryCodes = ['US', 'IN', 'CA']; // Define countryCodes here for color scale domain
    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(countryCodes); // Set domain for the color scale

    // Add SVG filters for shadows and gradients
    const defs = svg.append("defs");

    // Drop Shadow Filter for normal state
    defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%")
        .html(`
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"></feGaussianBlur>
                <feOffset dx="2" dy="2" result="offsetblur"></feOffset>
                <feFlood flood-color="#333" flood-opacity="0.3"></feFlood>
                <feComposite in2="offsetblur" operator="in"></feComposite>
                <feMerge>
                    <feMergeNode></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            `);

    // Drop Shadow Filter for hover state (stronger)
    defs.append("filter")
        .attr("id", "hover-shadow")
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%")
        .html(`
                <feGaussianBlur in="SourceAlpha" stdDeviation="5"></feGaussianBlur>
                <feOffset dx="3" dy="3" result="offsetblur"></feOffset>
                <feFlood flood-color="#3b82f6" flood-opacity="0.6"></feFlood> <!-- Blue glow -->
                <feComposite in2="offsetblur" operator="in"></feComposite>
                <feMerge>
                    <feMergeNode></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            `);

    // Add SVG gradients for each country's radar area (more complex "mesh" feel)
    countryCodes.forEach((code, i) => {
        const baseColor = color(code);
        const lighterColor = d3.rgb(baseColor).brighter(0.5);
        const darkerColor = d3.rgb(baseColor).darker(0.8);

        defs.append("linearGradient")
            .attr("id", `${code}_gradient`)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%") // Diagonal gradient for a nice effect
            .html(`
                    <stop offset="0%" stop-color="${lighterColor}" />
                    <stop offset="50%" stop-color="${baseColor}" />
                    <stop offset="100%" stop-color="${darkerColor}" />
                `);
    });

    // Function to draw or redraw the Spider Chart
    const drawSpiderChart = (data) => {
        svg.selectAll(".axis, .grid-circle, .radar-area, .radar-point, .axis-label").remove(); // Clear only chart elements

        // Recalculate dimensions and radius on resize
        width = chartContainer.clientWidth - margin.left - margin.right;
        height = chartContainer.clientHeight - margin.top - margin.bottom;
        const currentRadius = Math.min(width, height) / 2.5;

        d3.select("#spider-chart svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);
        svg.attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

        const numAxes = metrics.length;
        const angleSlice = Math.PI * 2 / numAxes; // Angle for each axis

        // Scale for each axis (0 to currentRadius)
        const rScale = d3.scaleLinear()
            .range([0, currentRadius])
            .domain([0, 1]); // Normalized domain

        // Create the axes lines
        const axis = svg.selectAll(".axis")
            .data(metrics)
            .enter()
            .append("g")
            .attr("class", "axis");

        axis.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d, i) => rScale(1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", (d, i) => rScale(1) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("class", "axis-line");

        // Add axis labels
        axis.append("text")
            .attr("class", "axis-label")
            .attr("x", (d, i) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2)) // Position slightly outside
            .attr("y", (d, i) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
            .text(d => d.name);

        // Create circular grid lines
        const gridCircles = 5; // Number of concentric circles
        svg.selectAll(".grid-circle")
            .data(d3.range(1, gridCircles + 1).map(i => i / gridCircles))
            .enter()
            .append("circle")
            .attr("class", "grid-line")
            .attr("r", d => rScale(d))
            .style("fill", "none");

        // The line generator for the radar areas
        const radarLine = d3.lineRadial()
            .radius(d => rScale(d.value))
            .angle((d, i) => i * angleSlice);

        // Draw the radar areas
        const radarAreas = svg.selectAll(".radar-area")
            .data(data)
            .enter()
            .append("path")
            .attr("class", d => `radar-area country-${d.countryCode}`)
            .attr("d", d => {
                // Initial state for animation: a single point at the center
                const initialPoint = { name: d.normalizedValues[0].name, value: 0 };
                const initialValues = Array(numAxes).fill(initialPoint);
                return radarLine(initialValues);
            })
            .attr("fill", d => `url(#${d.countryCode}_gradient)`) // Use gradient fill
            .attr("stroke", d => color(d.countryCode))
            .on("mouseover", function (event, d) {
                // Bring hovered element to front
                d3.select(this).raise(); // Raise the hovered path itself
                svg.selectAll(`.radar-point`).filter(p => p.countryCode === d.countryCode).raise(); // Also raise its associated points

                // Dim other areas
                d3.selectAll(".radar-area").transition().duration(200).attr("fill-opacity", 0.1);
                d3.selectAll(".radar-point").transition().duration(200).attr("opacity", 0.1);
                d3.select(this).transition().duration(200).attr("fill-opacity", 0.7).style("filter", "url(#hover-shadow)"); // Apply stronger shadow on hover
                svg.selectAll(`.radar-point`).filter(p => p.countryCode === d.countryCode).transition().duration(200).attr("opacity", 1).attr("r", 6); // Larger points on hover


                let tooltipHtml = `<strong>${d.countryCode}</strong><br>`;
                d.originalValues.forEach(val => {
                    tooltipHtml += `${val.name}: ${formatValue(val.value)}<br>`;
                });

                tooltip.style("opacity", 1)
                    .html(tooltipHtml)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.selectAll(".radar-area").transition().duration(200).attr("fill-opacity", 0.4).style("filter", "url(#drop-shadow)"); // Restore default shadow
                d3.selectAll(".radar-point").transition().duration(200).attr("opacity", 1).attr("r", 4); // Restore point size
                tooltip.style("opacity", 0);
            });

        // Animate radar areas to their final shape
        radarAreas.transition()
            .duration(1500) // Animation duration
            .ease(d3.easeElasticOut) // Elastic easing for a bouncy effect
            .attrTween("d", function (d) {
                const interpolate = d3.interpolate(
                    radarLine(Array(numAxes).fill({ name: d.normalizedValues[0].name, value: 0 })), // Start from center
                    radarLine(d.normalizedValues) // End at actual shape
                );
                return function (t) {
                    return interpolate(t);
                };
            });


        // Add circles at the data points for better visibility
        svg.selectAll(".radar-point")
            .data(data.flatMap(d => d.normalizedValues.map(v => ({ ...v, countryCode: d.countryCode }))))
            .enter()
            .append("circle")
            .attr("class", "radar-point")
            .attr("r", 4)
            .attr("cx", (d, i) => rScale(0) * Math.cos(angleSlice * (i % numAxes) - Math.PI / 2)) // Start at center for animation
            .attr("cy", (d, i) => rScale(0) * Math.sin(angleSlice * (i % numAxes) - Math.PI / 2))
            .attr("fill", d => color(d.countryCode))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .transition()
            .duration(1500) // Match radar area animation duration
            .ease(d3.easeElasticOut)
            .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * (i % numAxes) - Math.PI / 2))
            .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * (i % numAxes) - Math.PI / 2));
    };

    // 2. Data Loading and Processing
    // Removed populationUrl as we are using hardcoded demographic values

    const promises = countryCodes.map(code => d3.csv(`https://storage.googleapis.com/covid19-open-data/v3/location/${code}.csv`));

    Promise.all(promises).then((countrySpecificData) => {
        document.getElementById('loader').style.display = 'none'; // Hide initial loader

        const processedData = [];
        const allMetricValues = {}; // To store all values for normalization

        metrics.forEach(m => allMetricValues[m.key] = []);

        // Hardcoded approximate demographic values for demonstration
        const hardcodedDemographics = {
            'US': {
                'population': 330000000, // Approx
                'gdp_per_capita_usd': 70000, // Approx
                'life_expectancy': 79, // Approx
                'population_density': 36 // Approx
            },
            'IN': {
                'population': 1400000000, // Approx
                'gdp_per_capita_usd': 2500, // Approx
                'life_expectancy': 70, // Approx
                'population_density': 464 // Approx
            },
            'CA': {
                'population': 38000000, // Approx
                'gdp_per_capita_usd': 52000, // Approx
                'life_expectancy': 82, // Approx
                'population_density': 4 // Approx
            }
        };


        countrySpecificData.forEach((countryData, i) => {
            const countryCode = countryCodes[i];
            let latestValidEntry = null;

            // Find the latest valid entry within the date range for time-series data
            for (let j = countryData.length - 1; j >= 0; j--) {
                const entry = countryData[j];
                const entryDate = new Date(entry.date);

                if (entry.date && entryDate >= dataStartDate && entryDate <= dataEndDate &&
                    entry.cumulative_confirmed !== undefined && entry.cumulative_confirmed !== null && entry.cumulative_confirmed !== '' &&
                    entry.cumulative_deceased !== undefined && entry.cumulative_deceased !== null && entry.cumulative_deceased !== '') {

                    latestValidEntry = entry;
                    break;
                }
            }

            if (!latestValidEntry) {
                console.warn(`No valid time-series data found for ${countryCode} within the date range. Skipping this country.`);
                return; // Skip this country if essential time-series data is missing
            }

            const countryDemo = hardcodedDemographics[countryCode]; // Use hardcoded values
            if (!countryDemo) {
                console.warn(`No hardcoded demographic data found for ${countryCode}. Skipping this country.`);
                return;
            }
            console.log(`Demographic data for ${countryCode} (hardcoded):`, countryDemo);


            const countryMetrics = {};
            const originalValues = []; // To store original values for tooltip

            metrics.forEach(metric => {
                let value;
                if (metric.key in countryDemo) { // Check if demographic key exists in the hardcoded object
                    value = safeParseNumber(countryDemo[metric.key]);
                    console.log(`  ${countryCode} - Hardcoded demographic value for ${metric.name} (${metric.key}): ${value}`);
                } else if (metric.key in latestValidEntry) { // Check if time-series key exists
                    value = safeParseNumber(latestValidEntry[metric.key]);
                    console.log(`  ${countryCode} - Raw time-series value for ${metric.name} (${metric.key}): ${latestValidEntry[metric.key]}, Parsed: ${value}`);
                } else {
                    value = 0; // Default to 0 if metric key not found in either source
                    console.warn(`  ${countryCode} - Metric ${metric.name} (${metric.key}) not found in data. Using 0.`);
                }

                countryMetrics[metric.key] = value;
                allMetricValues[metric.key].push(value);
                originalValues.push({ name: metric.name, value: value });
            });

            processedData.push({
                countryCode: countryCode,
                metrics: countryMetrics,
                originalValues: originalValues
            });
        });

        // Normalize data (0-1 scale)
        // Need to calculate min/max for each metric across all countries
        const normalizedData = processedData.map(country => {
            const normalizedValues = metrics.map(metric => {
                const valuesForMetric = allMetricValues[metric.key];
                const minVal = d3.min(valuesForMetric);
                const maxVal = d3.max(valuesForMetric);

                let normalizedValue;
                if (maxVal === minVal) { // Avoid division by zero if all values are the same
                    normalizedValue = 0.5; // Assign a neutral value
                } else if (metric.higherIsBetter) {
                    normalizedValue = (country.metrics[metric.key] - minVal) / (maxVal - minVal);
                } else { // Lower is better (e.g., deaths, population density)
                    normalizedValue = 1 - ((country.metrics[metric.key] - minVal) / (maxVal - minVal));
                }
                return { name: metric.name, value: normalizedValue };
            });
            return {
                countryCode: country.countryCode,
                normalizedValues: normalizedValues,
                originalValues: country.originalValues // Keep original values for tooltip
            };
        });

        if (normalizedData.length === 0) {
            console.warn("No valid data found for any country to create the Spider Chart.");
            document.getElementById('loader').style.display = 'block';
            document.getElementById('loader').innerHTML = `<p class="text-gray-600 font-semibold">No valid data found to create the Spider Chart for the specified countries and date range. Ensure data is available for all selected metrics.</p>`;
            return;
        }

        console.log("Normalized Data for Spider Chart:", JSON.parse(JSON.stringify(normalizedData)));

        // Initial drawing of the Spider Chart
        drawSpiderChart(normalizedData);

        // --- Legend ---
        const legendData = normalizedData.map(d => ({
            name: d.countryCode,
            color: color(d.countryCode),
            originalData: d // Store full data for legend interactivity
        }));

        const legendContainer = d3.select("#legend-items");
        legendContainer.selectAll("*").remove(); // Clear previous legend items

        const legendItems = legendContainer.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .on("mouseover", function (event, d) {
                // Bring hovered element to front
                svg.select(`.radar-area.country-${d.name}`).raise();
                svg.selectAll(`.radar-point`).filter(p => p.countryCode === d.name).raise();

                d3.selectAll(".radar-area").transition().duration(200).attr("fill-opacity", 0.1);
                d3.selectAll(".radar-point").transition().duration(200).attr("opacity", 0.1);
                d3.select(`.radar-area.country-${d.name}`).transition().duration(200).attr("fill-opacity", 0.7).style("filter", "url(#hover-shadow)");
                svg.selectAll(`.radar-point`).filter(p => p.countryCode === d.name).transition().duration(200).attr("opacity", 1).attr("r", 6);

                let tooltipHtml = `<strong>${d.name}</strong><br>`;
                d.originalData.originalValues.forEach(val => {
                    tooltipHtml += `${val.name}: ${formatValue(val.value)}<br>`;
                });
                tooltip.style("opacity", 1)
                    .html(tooltipHtml)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.selectAll(".radar-area").transition().duration(200).attr("fill-opacity", 0.4).style("filter", "url(#drop-shadow)");
                d3.selectAll(".radar-point").transition().duration(200).attr("opacity", 1).attr("r", 4);
                tooltip.style("opacity", 0);
            });

        legendItems.append("div")
            .attr("class", "legend-color-box")
            .style("background-color", d => color(d.name)); // Use the color scale for legend box

        legendItems.append("span")
            .attr("class", "legend-text")
            .text(d => d.name);


        // Handle window resize to make the chart responsive
        window.addEventListener('resize', () => {
            drawSpiderChart(normalizedData); // Redraw on resize
        });

    }).catch(error => {
        console.error('Error loading or processing data:', error);
        document.getElementById('loader').innerHTML = '<p class="text-red-600 font-semibold">Failed to load data. Please check the console for details.</p>';
    });
})();