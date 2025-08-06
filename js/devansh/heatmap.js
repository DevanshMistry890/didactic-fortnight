(function () {

    // --- D3.js Heatmap Visualization ---

    // 1. Setup: Define dimensions and SVG container
    const margin = { top: 40, right: 30, bottom: 50, left: 80 }; // Increased left margin for country labels
    const chartContainer = document.getElementById('heatmap-chart');

    // Initial dimensions, will be updated on resize
    let width = chartContainer.clientWidth - margin.left - margin.right;
    let height = chartContainer.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#heatmap-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");
    const formatValue = d3.format(",.0f"); // Format new case values
    const formatDate = d3.timeFormat("%Y-%m-%d");

    // Define the valid date range for data
    const dataStartDate = new Date('2020-02-29');
    const dataEndDate = new Date('2022-06-17');

    // Helper function to safely parse a value to a number
    const safeParseNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // Function to draw or redraw the Heatmap
    const drawHeatmap = (data) => {
        svg.selectAll("*").remove(); // Clear previous chart elements

        // Recalculate dimensions on resize
        width = chartContainer.clientWidth - margin.left - margin.right;
        height = chartContainer.clientHeight - margin.top - margin.bottom;

        d3.select("#heatmap-chart svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);
        svg.attr("transform", `translate(${margin.left},${margin.top})`);

        // Extract unique dates and countries
        const dates = Array.from(new Set(data.map(d => d.date))).sort((a, b) => a - b);
        const countries = Array.from(new Set(data.map(d => d.country))).sort();

        // Scales
        const xScale = d3.scaleBand()
            .domain(dates)
            .range([0, width])
            .paddingInner(0.05); // Small padding between cells

        const yScale = d3.scaleBand()
            .domain(countries)
            .range([0, height])
            .paddingInner(0.05);

        // Color scale for new_confirmed cases
        // Using a sequential color scheme (greens) for intensity
        const maxCases = d3.max(data, d => d.value);
        const colorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, maxCases]); // From 0 to max new cases

        // Draw the cells
        svg.append("g")
            .attr("class", "cells")
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("class", "cell")
            .attr("x", d => xScale(d.date))
            .attr("y", d => yScale(d.country))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.value))
            .on("mouseover", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`
                               <strong>${d.country}</strong><br>
                               Date: ${formatDate(d.date)}<br>
                               New Cases: ${formatValue(d.value)}
                           `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
            });

        // Add X-axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickValues(xScale.domain().filter((d, i) => !(i % Math.floor(dates.length / 10)))) // Show ~10 ticks
                .tickFormat(d3.timeFormat("%b %Y")));

        // Add Y-axis
        svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(yScale));

        // Add a title for the X-axis
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style("text-anchor", "middle")
            .attr("class", "axis-label text-gray-700")
            .text("Date");

        // Add a title for the Y-axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 10)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("class", "axis-label text-gray-700")
            .text("Country");

        // --- Color Legend ---
        const legendContainer = d3.select("#color-legend");
        const legendLabelsContainer = d3.select("#color-legend-labels");

        // Update the CSS background for the gradient bar
        legendContainer.style("background", `linear-gradient(to right, ${colorScale.range().join(', ')})`);

        // Clear previous labels
        legendLabelsContainer.selectAll("*").remove();

        // Add labels for min and max values
        legendLabelsContainer.append("span").text(formatValue(0));
        legendLabelsContainer.append("span").text(formatValue(maxCases));
    };


    // 2. Data Loading and Processing
    const countryCodes = ['US', 'IN', 'CA'];
    const promises = countryCodes.map(code =>
        d3.csv(`https://storage.googleapis.com/covid19-open-data/v3/location/${code}.csv`)
    );

    Promise.all(promises).then((countrySpecificData) => {
        document.getElementById('loader').style.display = 'none'; // Hide initial loader

        const processedData = [];

        countrySpecificData.forEach((countryData, i) => {
            const countryCode = countryCodes[i];
            countryData.forEach(entry => {
                const entryDate = new Date(entry.date);

                // Filter by date range and ensure 'new_confirmed' exists
                if (entry.date && entryDate >= dataStartDate && entryDate <= dataEndDate &&
                    entry.new_confirmed !== undefined && entry.new_confirmed !== null && entry.new_confirmed !== '') {

                    processedData.push({
                        country: countryCode,
                        date: entryDate,
                        value: safeParseNumber(entry.new_confirmed)
                    });
                }
            });
        });

        if (processedData.length === 0) {
            console.warn(`No valid 'new_confirmed' data found for any country within the date range ${dataStartDate.toISOString().split('T')[0]} to ${dataEndDate.toISOString().split('T')[0]}.`);
            document.getElementById('loader').style.display = 'block';
            document.getElementById('loader').innerHTML = `<p class="text-gray-600 font-semibold">No valid data found to create the Heatmap for the specified countries and date range.</p>`;
            return;
        }

        console.log("Processed Data for Heatmap:", processedData.slice(0, 100)); // Log first 100 entries

        // Initial drawing of the Heatmap
        drawHeatmap(processedData);

        // Handle window resize to make the chart responsive
        window.addEventListener('resize', () => {
            drawHeatmap(processedData); // Redraw on resize
        });

    }).catch(error => {
        console.error('Error loading country data:', error);
        document.getElementById('loader').innerHTML = '<p class="text-red-600 font-semibold">Failed to load data. Please check the console for details.</p>';
    });
})();