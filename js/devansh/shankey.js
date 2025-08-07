
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

    const tooltip = d3.select("#tooltip-sankey");
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
        svg.selectAll("*").remove();

        width = chartContainer.clientWidth - margin.left - margin.right;
        height = chartContainer.clientHeight - margin.top - margin.bottom;
        
        d3.select("#sankey-chart svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

        const sankey = d3.sankey()
            .nodeId(d => d.name)
            .nodeWidth(30)
            .nodePadding(15)
            .extent([[0, 0], [width, height]]);

        try {
            if (graph.links.length === 0) {
                document.getElementById('loader2').style.display = 'block';
                document.getElementById('loader2').innerHTML = '<p class="text-gray-600 font-semibold">No valid data found to create Sankey diagram links within the specified date range.</p>';
                return;
            }

            const { nodes, links } = sankey(graph);

            const link = svg.append("g")
                .attr("class", "sankey-links")
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("class", "sankey-link")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke-width", d => d.width > 0 ? Math.max(2.5, d.width) : 1)
                .style("stroke", d => {
                    const s = d.source.name, t = d.target.name;
                    if (s === 'US' && t === 'Non-Fatal Cases') return '#4ade80';
                    if (s === 'US' && t === 'Deaths') return '#f87171';
                    if (s === 'IN' && t === 'Non-Fatal Cases') return '#60a5fa';
                    if (s === 'IN' && t === 'Deaths') return '#fbbf24';
                    if (s === 'CA' && t === 'Non-Fatal Cases') return '#f942ddff';
                    if (s === 'CA' && t === 'Deaths') return '#fb7185';
                    return '#9ca3af';
                })
                .style("stroke-opacity", 0.85)
                .attr("id", (d, i) => `link-${i}`);

            const node = svg.append("g")
                .attr("class", "sankey-nodes")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .attr("class", "sankey-node")
                .attr("transform", d => `translate(${safeParseNumber(d.x0)},${safeParseNumber(d.y0)})`)
                .attr("id", d => `node-${d.name.replace(/\s/g, '_')}`);

            node.append("rect")
                .attr("height", d => Math.max(1, (d.y1 - d.y0) || 0))
                .attr("width", d => Math.max(1, (d.x1 - d.x0) || 0))
                .style("fill", d => color(d.name));

            node.append("text")
                .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
                .attr("y", d => (safeParseNumber(d.y1) - safeParseNumber(d.y0)) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
                .text(d => d.name);

            node.on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`${d.name}<br>${format(d.value || 0)} Cases`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }).on("mouseout", () => tooltip.style("opacity", 0));

            link.on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`${d.source.name} → ${d.target.name}<br>${format(d.value || 0)}`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }).on("mouseout", () => tooltip.style("opacity", 0));

            const legendData = [
                { name: "US", color: color('US'), type: "country" },
                { name: "IN", color: color('IN'), type: "country" },
                { name: "CA", color: color('CA'), type: "country" },
                { name: "Deaths", color: color('Deaths'), type: "outcome" },
                { name: "Non-Fatal Cases", color: color('Non-Fatal Cases'), type: "outcome" }
            ];

            const legendContainer = d3.select("#legend-items-sankey");
            legendContainer.selectAll("*").remove(); // Clear previous legend items

            const legendItems = legendContainer.selectAll(".legend-item")
                .data(legendData)
                .enter()
                .append("div")
                .attr("class", "legend-item");

            legendItems.append("div")
                .attr("class", "legend-color-box")
                .style("background", d => d.color); 

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
            document.getElementById('loader2').style.display = 'block';
            document.getElementById('loader2').innerHTML = `<p class="text-red-600 font-semibold">An error occurred during chart rendering: ${e.message}. Please check the console.</p>`;
        }
    };

    const countryCodes = ['US', 'IN', 'CA'];
    const promises = countryCodes.map(code =>
        d3.csv(`https://storage.googleapis.com/covid19-open-data/v3/location/${code}.csv`)
    );

    Promise.all(promises).then((countrySpecificData) => {
        document.getElementById('loader2').style.display = 'none';
        const graph = { nodes: [], links: [] };
        const nodeSet = new Set();
        const nodesArray = [], linksArray = [];

        const addNode = (name) => {
            if (!nodeSet.has(name)) {
                nodeSet.add(name);
                nodesArray.push({ name: name });
            }
        };

        countrySpecificData.forEach((countryData, i) => {
            const countryCode = countryCodes[i];
            let latestValidEntry = null;

            for (let j = countryData.length - 1; j >= 0; j--) {
                const entry = countryData[j];
                const entryDate = new Date(entry.date);

                if (entry.date && entryDate >= dataStartDate && entryDate <= dataEndDate &&
                    entry.cumulative_confirmed && entry.cumulative_deceased &&
                    safeParseNumber(entry.cumulative_confirmed) >= 0 &&
                    safeParseNumber(entry.cumulative_deceased) >= 0) {
                    latestValidEntry = entry;
                    break;
                }
            }

            if (!latestValidEntry) return;

            const confirmed = safeParseNumber(latestValidEntry.cumulative_confirmed);
            const deceased = safeParseNumber(latestValidEntry.cumulative_deceased);
            const nonFatalCases = Math.max(0, confirmed - deceased);

            addNode(countryCode);
            addNode("Deaths");
            addNode("Non-Fatal Cases");

            if (confirmed > 0) {
                if (deceased > 0) linksArray.push({ source: countryCode, target: "Deaths", value: deceased });
                if (nonFatalCases > 0) linksArray.push({ source: countryCode, target: "Non-Fatal Cases", value: nonFatalCases });
            }
        });

        graph.nodes = nodesArray;
        graph.links = linksArray;
        drawSankey(graph);

        window.addEventListener('resize', () => drawSankey(graph));
    }).catch(error => {
        console.error('Error loading or processing data:', error);
        document.getElementById('loader2').innerHTML = '<p class="text-red-600 font-semibold">Failed to load data. Please check the console for details.</p>';
    });
})();
