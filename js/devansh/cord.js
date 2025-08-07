(function () {

    // --- D3.js Chord Diagram Visualization ---
    try {
        const countries = ['US', 'IN', 'BR', 'GB', 'FR', 'RU', 'ZA', 'AU']; // Selected countries
        const countryNames = {
            'US': 'USA',
            'IN': 'India',
            'BR': 'Brazil',
            'GB': 'United Kingdom',
            'FR': 'France',
            'RU': 'Russia',
            'ZA': 'South Africa',
            'AU': 'Australia'
        };

        const tooltipChord = d3.select("#tooltip-chord");

        // Define color scale for countries
        const colorChord = d3.scaleOrdinal(d3.schemePaired)
            .domain(countries);

        // Function to create a gradient for a ribbon
        const createGradient = (defs, id, color1, color2) => {
            const gradient = defs.append("linearGradient")
                .attr("id", id)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%");
            gradient.append("stop").attr("offset", "0%").attr("stop-color", color1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", color2);
        };

        // 2. Data processing and Chord layout
        const drawChordDiagram = (dataMatrix) => {
            try {
                const chordContainer = document.getElementById('chord-chart-container');
                const containerWidth = chordContainer.clientWidth;
                const containerHeight = chordContainer.clientHeight;

                // Clear previous SVG to redraw on resize
                d3.select("#chord-chart-container").select("svg").remove();

                // Check if container is too small to render the chart
                if (containerWidth < 200) {
                    console.warn("Container width is too small to render the chart. Please widen the window.");
                    document.getElementById('loader-chord').style.display = 'block';
                    document.getElementById('loader-chord').innerHTML = '<p class="text-red-600 font-semibold text-center">Chart cannot be displayed. Please widen the window.</p>';
                    return;
                }

                document.getElementById('loader-chord').style.display = 'none';

                const margin = { top: 20, right: 20, bottom: 20, left: 20 };

                const outerRadius = Math.min(containerWidth, 700) / 2 - 50;
                const innerRadius = outerRadius - 30;

                const svgChord = d3.select("#chord-chart-container")
                    .append("svg")
                    .attr("viewBox", `0 0 ${outerRadius * 2 + margin.left + margin.right} ${outerRadius * 2 + margin.top + margin.bottom}`)
                    .append("g")
                    .attr("transform", `translate(${outerRadius + margin.left},${outerRadius + margin.top})`);

                // Add SVG filters for a subtle drop shadow
                const defs = svgChord.append("defs");
                defs.append("filter")
                    .attr("id", "drop-shadow-chord")
                    .attr("height", "130%")
                    .html(`
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2"></feGaussianBlur>
                            <feOffset dx="1" dy="1" result="offsetblur"></feOffset>
                            <feMerge>
                                <feMergeNode></feMergeNode>
                                <feMergeNode in="SourceGraphic"></feMergeNode>
                            </feMerge>
                        `);

                // D3 Chord layout generator
                const chord = d3.chord()
                    .padAngle(0.05)
                    .sortSubgroups(d3.descending)
                    (dataMatrix);

                // Arc generator for the outer groups
                const arc = d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius);

                // Ribbon generator for the chords
                const ribbon = d3.ribbon()
                    .radius(innerRadius);

                // Create gradients for each ribbon
                chord.forEach(c => {
                    const sourceCountry = countries[c.source.index];
                    const targetCountry = countries[c.target.index];
                    const sourceColor = colorChord(sourceCountry);
                    const targetColor = colorChord(targetCountry);
                    createGradient(defs, `ribbon-${c.source.index}-${c.target.index}`, sourceColor, targetColor);
                });

                // Draw the groups (arcs)
                const groups = svgChord.selectAll(".chord-group")
                    .data(chord.groups)
                    .join("path")
                    .attr("class", d => `chord-group country-${countries[d.index]}`) // Add country class
                    .attr("fill", d => colorChord(countries[d.index]))
                    .attr("d", arc)
                    .on("mouseover", function (event, d) {
                        // Dim all other groups and ribbons
                        d3.selectAll(".chord-group, .chord-ribbon").transition().duration(200).style("opacity", 0.2);

                        // Highlight this group and its related ribbons
                        d3.select(this).transition().duration(200).style("opacity", 1);
                        svgChord.selectAll(".chord-ribbon")
                            .filter(ribbonData => ribbonData.source.index === d.index || ribbonData.target.index === d.index)
                            .transition().duration(200).style("opacity", 1);

                        tooltipChord.style("opacity", 1)
                            .html(`
                                            <strong>${countryNames[countries[d.index]]}</strong><br>
                                            Total Cases: ${d3.format(",.0f")(d.value)}
                                        `)
                            .style("left", (event.pageX + 15) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function () {
                        d3.selectAll(".chord-group, .chord-ribbon").transition().duration(200).style("opacity", 1);
                        tooltipChord.style("opacity", 0);
                    });

                // Add country labels
                groups.append("title").text(d => `${countryNames[countries[d.index]]}: ${d3.format(",.0f")(d.value)}`);
                svgChord.selectAll(".chord-label")
                    .data(chord.groups)
                    .join("text")
                    .attr("class", "chord-label")
                    .attr("dy", ".35em")
                    .attr("transform", d => {
                        const angle = (d.startAngle + d.endAngle) / 2;
                        return `rotate(${angle * 180 / Math.PI - 90}) translate(${outerRadius + 10})` +
                            (angle > Math.PI ? "rotate(180)" : "");
                    })
                    .attr("text-anchor", d => (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start")
                    .text(d => countryNames[countries[d.index]]);

                // Draw the ribbons
                svgChord.selectAll(".chord-ribbon")
                    .data(chord)
                    .join("path")
                    .attr("class", d => `chord-ribbon ribbon-source-${d.source.index} ribbon-target-${d.target.index}`)
                    .attr("d", ribbon)
                    .attr("fill", d => `url(#ribbon-${d.source.index}-${d.target.index})`)
                    .on("mouseover", function (event, d) {
                        // Dim all other groups and ribbons
                        d3.selectAll(".chord-group, .chord-ribbon").transition().duration(200).style("opacity", 0.2);

                        // Highlight the hovered ribbon and its connected groups
                        d3.select(this).transition().duration(200).style("opacity", 1);
                        d3.selectAll(`.country-${countries[d.source.index]}, .country-${countries[d.target.index]}`)
                            .transition().duration(200).style("opacity", 1);

                        tooltipChord.style("opacity", 1)
                            .html(`
                                            <strong>${countryNames[countries[d.source.index]]} &rarr; ${countryNames[countries[d.target.index]]}</strong><br>
                                            Cases: ${d3.format(",.0f")(d.source.value)}
                                        `)
                            .style("left", (event.pageX + 15) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function () {
                        d3.selectAll(".chord-ribbon, .chord-group").transition().duration(200).style("opacity", 1);
                        tooltipChord.style("opacity", 0);
                    });

                // --- Legend ---
                const legendDataChord = countries.map(countryCode => ({
                    name: countryNames[countryCode],
                    code: countryCode,
                    color: colorChord(countryCode)
                }));

                const legendContainerChord = d3.select("#legend-items-chord");
                legendContainerChord.selectAll("*").remove();

                const legendItemsChord = legendContainerChord.selectAll(".legend-item-chord")
                    .data(legendDataChord)
                    .enter()
                    .append("div")
                    .attr("class", "legend-item-chord")
                    .on("mouseover", function (event, d) {
                        d3.selectAll(".chord-group, .chord-ribbon").transition().duration(200).style("opacity", 0.2);
                        d3.selectAll(`.country-${d.code}`).transition().duration(200).style("opacity", 1);
                        svgChord.selectAll(".chord-ribbon")
                            .filter(ribbonData => ribbonData.source.index === countries.indexOf(d.code) || ribbonData.target.index === countries.indexOf(d.code))
                            .transition().duration(200).style("opacity", 1);
                    })
                    .on("mouseout", function () {
                        d3.selectAll(".chord-group, .chord-ribbon").transition().duration(200).style("opacity", 1);
                    });

                legendItemsChord.append("div")
                    .attr("class", "legend-color-box-chord")
                    .style("background-color", d => d.color);

                legendItemsChord.append("span")
                    .attr("class", "legend-text-chord")
                    .text(d => d.name);
            } catch (error) {
                console.error("Error drawing Chord Diagram:", error);
            }
        };

        // Example Matrix: This is a synthetic matrix as real 'case flow' data is not available.
        // The diagonal values represent internal cases. Off-diagonal are hypothetical flows.
        const exampleMatrix = [
            // US, IN, BR, GB, FR, RU, ZA, AU
            [1200, 30, 20, 15, 10, 5, 2, 8],  // US
            [40, 950, 15, 8, 5, 2, 3, 1],   // India
            [25, 20, 800, 12, 18, 6, 4, 3],  // Brazil
            [10, 5, 10, 450, 25, 7, 3, 6],   // UK
            [8, 4, 15, 22, 380, 10, 5, 4],   // France
            [5, 2, 7, 6, 9, 250, 1, 2],    // Russia
            [3, 1, 4, 3, 4, 2, 180, 2],    // South Africa
            [10, 2, 5, 7, 6, 3, 1, 150]    // Australia
        ];

        // Initial draw
        window.onload = function () {
            drawChordDiagram(exampleMatrix);
        };

        // Handle window resize to make the chart responsive
        window.addEventListener('resize', () => {
            drawChordDiagram(exampleMatrix); // Redraw on resize with current data
        });


    } catch (error) {
        console.error("Initialization Error:", error);
    }

})();