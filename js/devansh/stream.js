(function () {
    // --- D3.js Streamgraph Visualization ---

    // 1. Setup: Define dimensions and SVG container
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const chartContainer = document.getElementById('streamgraph-chart');

    let width = chartContainer.clientWidth - margin.left - margin.right;
    let height = chartContainer.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#streamgraph-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");
    const formatValue = d3.format(".1f"); // Format search trend values
    const formatDate = d3.timeFormat("%Y-%m-%d");

    // Define the valid date range for data
    const dataStartDate = new Date('2020-02-29');
    const dataEndDate = new Date('2022-06-17');

    // Helper function to safely parse a value to a number
    const safeParseNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // List of search trend columns to visualize
    const symptomKeys = [
        'search_trends_cough',
        'search_trends_fever',
        'search_trends_shortness_of_breath',
        'search_trends_anosmia', // Loss of smell
        'search_trends_ageusia', // Loss of taste
        'search_trends_fatigue',
        'search_trends_anxiety',
        'search_trends_sore_throat',
        'search_trends_headache'
    ];

    // Function to convert symptom key to a human-readable name
    const getSymptomDisplayName = (key) => {
        return key.replace('search_trends_', '').replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Color scale (using Tableau10 for more distinct colors)
    const color = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(symptomKeys.map(key => getSymptomDisplayName(key))); // Use display names for color domain

    // Add SVG filters for shadows
    const defs = svg.append("defs");

    // Drop Shadow Filter for normal state
    defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%")
        .html(`
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"></feGaussianBlur>
                <feOffset dx="1" dy="1" result="offsetblur"></feOffset>
                <feFlood flood-color="#333" flood-opacity="0.2"></feFlood>
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
                <feGaussianBlur in="SourceAlpha" stdDeviation="4"></feGaussianBlur>
                <feOffset dx="2" dy="2" result="offsetblur"></feOffset>
                <feFlood flood-color="#3b82f6" flood-opacity="0.5"></feFlood> <!-- Blue glow -->
                <feComposite in2="offsetblur" operator="in"></feComposite>
                <feMerge>
                    <feMergeNode></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            `);

    // Add SVG gradients for each stream area
    symptomKeys.forEach((key) => {
        const displayName = getSymptomDisplayName(key);
        const baseColor = color(displayName);
        const lighterColor = d3.rgb(baseColor).brighter(0.5);
        const darkerColor = d3.rgb(baseColor).darker(0.8);

        defs.append("linearGradient")
            .attr("id", `${key}_gradient`)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%") // Vertical gradient for streams
            .html(`
                    <stop offset="0%" stop-color="${lighterColor}" />
                    <stop offset="50%" stop-color="${baseColor}" />
                    <stop offset="100%" stop-color="${darkerColor}" />
                `);
    });

    // Function to draw or redraw the Streamgraph
    const drawStreamgraph = (data) => {
        svg.selectAll(".streams, .axis, .axis-label").remove(); // Clear only chart elements

        // Recalculate dimensions on resize
        width = chartContainer.clientWidth - margin.left - margin.right;
        height = chartContainer.clientHeight - margin.top - margin.bottom;

        d3.select("#streamgraph-chart svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);
        svg.attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        // Stack generator for streamgraph (wiggle baseline)
        const stack = d3.stack()
            .keys(symptomKeys)
            .offset(d3.stackOffsetWiggle) // Centers the stream
            .order(d3.stackOrderInsideOut); // Orders layers to minimize changes

        const stackedData = stack(data);
        console.log("Stacked Data for Streamgraph:", stackedData);

        // Determine the overall min and max of y0 and y1 from stackedData
        const allYValues = [];
        stackedData.forEach(layer => {
            layer.forEach(d => {
                if (!isNaN(d[0])) allYValues.push(d[0]);
                if (!isNaN(d[1])) allYValues.push(d[1]);
            });
        });

        const minY = d3.min(allYValues);
        const maxY = d3.max(allYValues);

        console.log(`DEBUG: yScale domain [minY, maxY]: [${minY}, ${maxY}]`);

        const yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([height, 0]);

        // Area generator for streams
        const area = d3.area()
            .x(d => xScale(d.data.date))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]));

        // Draw the streams
        const streams = svg.append("g")
            .attr("class", "streams")
            .selectAll("path")
            .data(stackedData)
            .join("path")
            .attr("class", d => `stream stream-${d.key}`)
            .attr("fill", d => `url(#${d.key}_gradient)`) // Use gradient fill
            .attr("d", d => {
                // Initial state for animation: flat line at center
                const initialArea = d3.area()
                    .x(p => xScale(p.data.date))
                    .y0(yScale(0))
                    .y1(yScale(0));
                return initialArea(d);
            })
            .on("mouseover", function (event, d) {
                // Bring hovered stream to front
                d3.select(this).raise();

                // Dim other streams
                d3.selectAll(".stream").transition().duration(200).attr("fill-opacity", 0.1).style("filter", "none");
                d3.select(this).transition().duration(200).attr("fill-opacity", 1).style("filter", "url(#hover-shadow)");

                const [xCoord, yCoord] = d3.pointer(event);
                const date = xScale.invert(xCoord);
                // Find the data point closest to the hovered x-coordinate
                const closestDataPoint = data.reduce((prev, curr) =>
                    Math.abs(curr.date - date) < Math.abs(prev.date - date) ? curr : prev
                );

                if (closestDataPoint) {
                    const symptomName = getSymptomDisplayName(d.key);
                    const value = closestDataPoint[d.key]; // Get the raw value for the symptom

                    tooltip.style("opacity", 1)
                        .html(`
                                   <strong>${symptomName}</strong><br>
                                   Date: ${formatDate(closestDataPoint.date)}<br>
                                   Search Interest: ${formatValue(value)}
                               `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function () {
                d3.selectAll(".stream").transition().duration(200).attr("fill-opacity", 0.8).style("filter", "url(#drop-shadow)");
                tooltip.style("opacity", 0);
            });

        // Animate streams to their final shape
        streams.transition()
            .duration(2000) // Animation duration
            .ease(d3.easeElasticOut) // Elastic easing for a bouncy effect
            .attr("d", area); // Transition to the actual area path


        // Add X-axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %Y")));

        // Add Y-axis
        svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatValue(d)));

        // Add a title for the Y-axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 10)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("class", "axis-label text-gray-700")
            .text("Search Interest (Normalized)");

        // Add a title for the X-axis
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style("text-anchor", "middle")
            .attr("class", "axis-label text-gray-700")
            .text("Date");

        // --- Legend ---
        const legendData = symptomKeys.map(key => ({
            name: getSymptomDisplayName(key),
            key: key, // Add key for filtering
            color: color(getSymptomDisplayName(key))
        }));

        const legendContainer = d3.select("#legend-items");
        legendContainer.selectAll("*").remove(); // Clear previous legend items

        const legendItems = legendContainer.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .on("mouseover", function (event, d) {
                d3.selectAll(".stream").transition().duration(200).attr("fill-opacity", 0.1).style("filter", "none");
                d3.select(`.stream-${d.key}`).transition().duration(200).attr("fill-opacity", 1).style("filter", "url(#hover-shadow)").raise(); // Raise on legend hover
            })
            .on("mouseout", function () {
                d3.selectAll(".stream").transition().duration(200).attr("fill-opacity", 0.8).style("filter", "url(#drop-shadow)");
            });

        legendItems.append("div")
            .attr("class", "legend-color-box")
            .style("background-color", d => d.color);

        legendItems.append("span")
            .attr("class", "legend-text")
            .text(d => d.name);
    };


    // 2. Data Loading for USA
    const countryCode = 'US'; // Focusing only on USA
    d3.csv(`https://storage.googleapis.com/covid19-open-data/v3/location/${countryCode}.csv`).then((countryData) => {
        document.getElementById('loader3').style.display = 'none'; // Hide initial loader

        const processedData = [];

        countryData.forEach(entry => {
            const entryDate = new Date(entry.date);

            // Filter by date range
            if (entry.date && entryDate >= dataStartDate && entryDate <= dataEndDate) {
                let hasValidSymptomData = false;
                const row = { date: entryDate };

                symptomKeys.forEach(key => {
                    const value = safeParseNumber(entry[key]);
                    if (value > 0) hasValidSymptomData = true; // Check if at least one symptom has data
                    row[key] = value;
                });

                if (hasValidSymptomData) {
                    processedData.push(row);
                }
            }
        });

        // Sort data by date
        processedData.sort((a, b) => a.date - b.date);

        if (processedData.length === 0) {
            console.warn(`No valid search trend data found for ${countryCode} within the date range ${dataStartDate.toISOString().split('T')[0]} to ${dataEndDate.toISOString().split('T')[0]}.`);
            document.getElementById('loader3').style.display = 'block';
            document.getElementById('loader3').innerHTML = `<p class="text-gray-600 font-semibold">No valid search trend data found for the USA within the specified date range to create the Streamgraph.</p>`;
            return;
        }

        console.log("Processed Data for Streamgraph:", processedData);

        // Initial drawing of the Streamgraph
        drawStreamgraph(processedData);

        // Handle window resize to make the chart responsive
        window.addEventListener('resize', () => {
            drawStreamgraph(processedData); // Redraw on resize with current data
        });

    }).catch(error => {
        console.error('Error loading country data:', error);
        document.getElementById('loader3').innerHTML = '<p class="text-red-600 font-semibold">Failed to load data for the USA. Please check the console for details.</p>';
    });
})();