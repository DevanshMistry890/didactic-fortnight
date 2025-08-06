// --- D3.js Sankey Visualization ---

(function () {
    // 1. Setup: Define dimensions and SVG container
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartContainer = document.getElementById('sankey-chart');

    // Initial dimensions, will be updated on resize
    let width = chartContainer.clientWidth - margin.left - margin.right;
    let height = chartContainer.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#sankey-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");
    const format = d3.format(",.0f");

    // Define the valid date range for data
    const dataStartDate = new Date('2020-02-29');
    const dataEndDate = new Date('2022-06-17');

    // Helper function to safely parse a value to a number
    const safeParseNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // Define a color scale for nodes (countries)
    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(['US', 'IN', 'CA', 'Deaths', 'Non-Fatal Cases']);


    // Function to draw or redraw the Sankey diagram
    const drawSankey = (graph) => {
        // Clear previous chart elements
        svg.selectAll("*").remove();

        // Define SVG gradients for links and nodes
        const defs = svg.append("defs");

        // Gradients for country links (more complex "mesh" feel)
        countryCodes.forEach((code, i) => {
            const baseColor = color(code);
            const lighterColor = d3.rgb(baseColor).brighter(0.5);
            const darkerColor = d3.rgb(baseColor).darker(0.8);

            defs.append("linearGradient")
                .attr("id", `${code}_link_gradient`)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .html(`
                        <stop offset="0%" stop-color="${lighterColor}" />
                        <stop offset="50%" stop-color="${baseColor}" />
                        <stop offset="100%" stop-color="${darkerColor}" />
                    `);
        });

        // Gradient for outcome nodes (Deaths, Non-Fatal Cases)
        const outcomeBaseColor = "#a0aec0"; // Gray from original style
        const outcomeLighterColor = d3.rgb(outcomeBaseColor).brighter(0.5);
        const outcomeDarkerColor = d3.rgb(outcomeBaseColor).darker(0.8);

        defs.append("linearGradient")
            .attr("id", "outcome_gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .html(`
                    <stop offset="0%" stop-color="${outcomeLighterColor}" />
                    <stop offset="50%" stop-color="${outcomeBaseColor}" />
                    <stop offset="100%" stop-color="${outcomeDarkerColor}" />
                `);


        // Update dimensions based on current container size
        width = chartContainer.clientWidth - margin.left - margin.right;
        height = chartContainer.clientHeight - margin.top - margin.bottom;

        // Update SVG viewBox
        d3.select("#sankey-chart svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

        const sankey = d3.sankey()
            .nodeId(d => d.name) // Sankey will use 'name' property to identify nodes
            .nodeWidth(30)
            .nodePadding(15) // Increased padding
            .extent([[0, 0], [width, height]]);

        // Compute the Sankey layout. This modifies graph.nodes and graph.links in place.
        try {
            // IMPORTANT: Only run sankey layout if there are links
            if (graph.links.length === 0) {
                console.warn("No links in the graph for drawing Sankey. Displaying message.");
                document.getElementById('loader2').style.display = 'block';
                document.getElementById('loader2').innerHTML = '<p class="text-gray-600 font-semibold">No valid data found to create Sankey diagram links within the specified date range.</p>';
                return; // Exit the function if no links
            }

            // Call sankey layout. It expects link.source and link.target to be node IDs (names in our case)
            const { nodes, links } = sankey(graph);
            console.log("Nodes after Sankey layout:", nodes);
            console.log("Links after Sankey layout:", links);

            // Draw links
            const link = svg.append("g")
                .attr("class", "sankey-links")
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("class", "sankey-link")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke-width", d => Math.max(3, d.width || 0)) // Ensure minimum width of 3px
                .style("stroke", d => {
                    // Apply specific gradient based on source country
                    if (countryCodes.includes(d.source.name)) {
                        return `url(#${d.source.name}_link_gradient)`;
                    }
                    return color(d.source.name); // Fallback to categorical color
                })
                .attr("id", (d, i) => `link-${i}`); // Add ID for easier selection

            // Animation for links
            link.each(function (d) {
                const length = this.getTotalLength();
                d3.select(this)
                    .attr("stroke-dasharray", length + " " + length)
                    .attr("stroke-dashoffset", length)
                    .transition()
                    .duration(1500)
                    .ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0);
            });


            // Draw nodes
            const node = svg.append("g")
                .attr("class", "sankey-nodes")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .attr("class", "sankey-node")
                .attr("transform", d => {
                    // Ensure x0 and y0 are numbers before translating
                    const safeX = safeParseNumber(d.x0);
                    const safeY = safeParseNumber(d.y0);
                    return `translate(${safeX},${safeY})`;
                })
                .attr("id", d => `node-${d.name.replace(/\s/g, '_')}`); // Add ID for easier selection

            node.append("rect")
                .attr("height", d => Math.max(1, (d.y1 - d.y0) || 0)) // Ensure height is not NaN or 0
                .attr("width", d => Math.max(1, (d.x1 - d.x0) || 0))   // Ensure width is not NaN or 0
                .style("fill", d => {
                    // Apply a general node gradient for outcome nodes
                    if (['Deaths', 'Non-Fatal Cases'].includes(d.name)) {
                        return "url(#outcome_gradient)";
                    }
                    return color(d.name); // Use categorical color for country nodes
                });

            // Add node labels
            node.append("text")
                .attr("x", d => {
                    const safeX1 = safeParseNumber(d.x1);
                    const safeX0 = safeParseNumber(d.x0);
                    return d.x0 < width / 2 ? safeX1 + 6 : safeX0 - 6;
                })
                .attr("y", d => {
                    const safeY1 = safeParseNumber(d.y1);
                    const safeY0 = safeParseNumber(d.y0);
                    return (safeY1 - safeY0) / 2;
                })
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
                .text(d => d.name);

            // --- 5. Interactivity ---
            node.on("mouseover", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`${d.name}<br>${format(d.value || 0)} Cases`) // d.value is populated by sankey layout
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
                .on("mouseout", function () {
                    tooltip.style("opacity", 0);
                });

            link.on("mouseover", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`${d.source.name} → ${d.target.name}<br>${format(d.value || 0)}`) // d.value is populated by sankey layout
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
                .on("mouseout", function () {
                    tooltip.style("opacity", 0);
                });

            // --- 6. Interactive Legend ---
            const legendData = [
                { name: "US", color: color('US'), type: "country" },
                { name: "IN", color: color('IN'), type: "country" },
                { name: "CA", color: color('CA'), type: "country" },
                { name: "Deaths", color: color('Deaths'), type: "outcome" },
                { name: "Non-Fatal Cases", color: color('Non-Fatal Cases'), type: "outcome" }
            ];

            const legendContainer = d3.select("#legend-items");
            legendContainer.selectAll("*").remove(); // Clear previous legend items

            const legendItems = legendContainer.selectAll(".legend-item")
                .data(legendData)
                .enter()
                .append("div")
                .attr("class", "legend-item");

            legendItems.append("div")
                .attr("class", "legend-color-box")
                .style("background", d => d.color); // Use the actual color from the scale

            legendItems.append("span")
                .attr("class", "legend-text")
                .text(d => d.name);

            // Legend interactivity
            legendItems.on("mouseover", function (event, legendD) {
                // Dim all nodes and links first
                node.transition().duration(200).style("opacity", 0.2);
                link.transition().duration(200).style("opacity", 0.2);

                if (legendD.type === "country") {
                    // Highlight country node
                    d3.select(`#node-${legendD.name.replace(/\s/g, '_')}`).transition().duration(200).style("opacity", 1);
                    // Highlight links originating from this country
                    link.filter(d => d.source.name === legendD.name)
                        .transition().duration(200).style("opacity", 1);
                    // Highlight target nodes of these links
                    link.filter(d => d.source.name === legendD.name)
                        .each(d => {
                            d3.select(`#node-${d.target.name.replace(/\s/g, '_')}`).transition().duration(200).style("opacity", 1);
                        });
                } else if (legendD.type === "outcome") {
                    // Highlight outcome node
                    d3.select(`#node-${legendD.name.replace(/\s/g, '_')}`).transition().duration(200).style("opacity", 1);
                    // Highlight links targeting this outcome
                    link.filter(d => d.target.name === legendD.name)
                        .transition().duration(200).style("opacity", 1);
                    // Highlight source nodes of these links
                    link.filter(d => d.target.name === legendD.name)
                        .each(d => {
                            d3.select(`#node-${d.source.name.replace(/\s/g, '_')}`).transition().duration(200).style("opacity", 1);
                        });
                }
            })
                .on("mouseout", function () {
                    // Restore full opacity to all nodes and links
                    node.transition().duration(200).style("opacity", 1);
                    link.transition().duration(200).style("opacity", 0.7);
                });


        } catch (e) {
            console.error("Error during Sankey layout or drawing:", e);
            document.getElementById('loader2').style.display = 'block'; // Show loader with error message
            document.getElementById('loader2').innerHTML = `<p class="text-red-600 font-semibold">An error occurred during chart rendering: ${e.message}. Please check the console.</p>`;
        }
    };


    // 2. Data Loading
    const countryCodes = ['US', 'IN', 'CA'];
    const promises = countryCodes.map(code =>
        d3.csv(`https://storage.googleapis.com/covid19-open-data/v3/location/${code}.csv`)
    );

    Promise.all(promises).then((countrySpecificData) => {
        document.getElementById('loader2').style.display = 'none'; // Hide initial loader

        // --- 3. Data Wrangling for Sankey ---
        const graph = {
            nodes: [],
            links: []
        };

        const nodeSet = new Set();
        const nodesArray = [];
        const linksArray = [];

        const addNode = (name) => {
            if (!nodeSet.has(name)) {
                nodeSet.add(name);
                nodesArray.push({ name: name });
            }
        };

        countrySpecificData.forEach((countryData, i) => {
            const countryCode = countryCodes[i];
            let latestValidEntry = null;

            // Iterate backwards to find the latest valid entry within the date range
            for (let j = countryData.length - 1; j >= 0; j--) {
                const entry = countryData[j];
                const entryDate = new Date(entry.date);

                // Check if date is within range and required fields are valid numbers
                if (entry.date && entryDate >= dataStartDate && entryDate <= dataEndDate &&
                    entry.cumulative_confirmed !== undefined && entry.cumulative_confirmed !== null && entry.cumulative_confirmed !== '' &&
                    entry.cumulative_deceased !== undefined && entry.cumulative_deceased !== null && entry.cumulative_deceased !== '' &&
                    safeParseNumber(entry.cumulative_confirmed) >= 0 &&
                    safeParseNumber(entry.cumulative_deceased) >= 0) {

                    latestValidEntry = entry;
                    console.log(`Found latest valid entry for ${countryCode} on ${entry.date}`);
                    break; // Found the latest valid entry, stop searching
                }
            }

            if (!latestValidEntry) {
                console.warn(`No valid data found for ${countryCode} within the date range ${dataStartDate.toISOString().split('T')[0]} to ${dataEndDate.toISOString().split('T')[0]}. Skipping this country.`);
                return;
            }

            console.log(`Raw latest valid entry for ${countryCode}:`, latestValidEntry);

            // Safely parse values, ensuring they are numbers. Use 0 if invalid.
            const confirmed = safeParseNumber(latestValidEntry.cumulative_confirmed);
            const deceased = safeParseNumber(latestValidEntry.cumulative_deceased);

            // Calculate "Non-Fatal Cases"
            const nonFatalCases = Math.max(0, confirmed - deceased);

            console.log(`Parsed data for ${countryCode}: Confirmed=${confirmed}, Deaths=${deceased}, Non-Fatal Cases=${nonFatalCases}`);

            // Add nodes for the 2-layer structure
            addNode(countryCode); // Layer 1
            addNode("Deaths"); // Layer 2 global
            addNode("Non-Fatal Cases"); // Layer 2 global

            // Add links for the 2-layer structure
            if (confirmed > 0) {
                // Link from Country to Deaths
                if (deceased > 0) {
                    linksArray.push({
                        source: countryCode,
                        target: "Deaths",
                        value: deceased
                    });
                }
                // Link from Country to Non-Fatal Cases
                if (nonFatalCases > 0) {
                    linksArray.push({
                        source: countryCode,
                        target: "Non-Fatal Cases",
                        value: nonFatalCases
                    });
                }
            } else {
                console.log(`No confirmed cases for ${countryCode}, skipping links.`);
            }
        });

        graph.nodes = nodesArray;
        graph.links = linksArray;

        console.log("Graph object before Sankey layout (with string names for links):", JSON.parse(JSON.stringify(graph)));

        // Initial drawing of the Sankey chart
        drawSankey(graph);

        // Handle window resize to make the chart responsive
        window.addEventListener('resize', () => {
            drawSankey(graph); // Redraw on resize
        });

    }).catch(error => {
        console.error('Error loading or processing data:', error);
        document.getElementById('loader2').innerHTML = '<p class="text-red-600 font-semibold">Failed to load data. Please check the console for details.</p>';
    });
})();