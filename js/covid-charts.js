// Fetch COVID-19 data
fetch('https://disease.sh/v3/covid-19/historical/all?lastdays=365')
  .then(response => response.json())
  .then(data => {
    // Process data for visualization
    const dates = Object.keys(data.cases);
    const cases = Object.values(data.cases);
    const deaths = Object.values(data.deaths);
    
    // Calculate monthly data for bar chart (total cases)
    const monthlyData = {};
    dates.forEach((date, i) => {
      const month = date.split('/')[0] + '/' + date.split('/')[2];
      monthlyData[month] = cases[i];
    });

    // Calculate quarterly data for pie chart (deaths)
    const quarterlyDeaths = {};
    dates.forEach((date, i) => {
      const month = parseInt(date.split('/')[0]);
      const quarter = Math.ceil(month / 3);
      const year = date.split('/')[2];
      const key = `Q${quarter} ${year}`;
      if (!quarterlyDeaths[key]) {
        quarterlyDeaths[key] = deaths[i] - (i > 0 ? deaths[i-1] : 0);
      } else {
        quarterlyDeaths[key] += deaths[i] - (i > 0 ? deaths[i-1] : 0);
      }
    });

    // Set up dimensions
    const margin = {top: 20, right: 30, bottom: 60, left: 80};
    const width = document.getElementById('bar-chart').offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Line Chart for Total Cases
    const svg = d3.select('#bar-chart')
      .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scaleTime()
      .domain(d3.extent(Object.keys(monthlyData), d => new Date(d)))
      .range([0, width]);
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('fill', '#808191');

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, d3.max(Object.values(monthlyData))])
      .range([height, 0]);
    svg.append('g')
      .call(d3.axisLeft(y)
        .tickFormat(d => d3.format('.2s')(d)))
      .selectAll('text')
      .style('fill', '#808191');

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#808191')
      .text('Number of Cases');

    // Add X axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#808191')
      .text('Month');

    // Add the line
    const line = d3.line()
      .x(d => x(new Date(d[0])))
      .y(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(Object.entries(monthlyData))
      .attr('fill', 'none')
      .attr('stroke', '#6c5dd3')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add dots
    svg.selectAll('.dot')
      .data(Object.entries(monthlyData))
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(new Date(d[0])))
      .attr('cy', d => y(d[1]))
      .attr('r', 5)
      .attr('fill', '#6c5dd3')
      .style('opacity', 0.8);

    // Add tooltip for line chart
    const lineTooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#1f2128')
      .style('color', '#808191')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');

    // Add hover effect for dots
    svg.selectAll('.dot')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('r', 7);
        
        lineTooltip
          .style('visibility', 'visible')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`Month: ${d[0]}<br>Total Cases: ${d3.format(',')(d[1])}`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('r', 5);
        lineTooltip.style('visibility', 'hidden');
      });

    // Add hover effect for line segments
    const focus = svg.append('g')
      .style('display', 'none');

    focus.append('circle')
      .attr('r', 5)
      .style('fill', '#ffffff');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', mousemove);

    function mousemove(event) {
      const bisect = d3.bisector(d => new Date(d[0])).left;
      const x0 = x.invert(d3.pointer(event)[0]);
      const data = Object.entries(monthlyData);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      if (!d0 || !d1) return;
      const d = x0 - new Date(d0[0]) > new Date(d1[0]) - x0 ? d1 : d0;
      
      focus.attr('transform', `translate(${x(new Date(d[0]))},${y(d[1])})`);
      
      lineTooltip
        .style('visibility', 'visible')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`Month: ${d[0]}<br>Total Cases: ${d3.format(',')(d[1])}`);
    }

    // Pie Chart for Deaths
    const radius = Math.min(width, height) / 2;

    const pieWidth = document.getElementById('pie-chart').offsetWidth - margin.left - margin.right;
    const pieHeight = 400 - margin.top - margin.bottom;

    const pieSvg = d3.select('#pie-chart')
      .append('svg')
        .attr('width', pieWidth + margin.left + margin.right)
        .attr('height', pieHeight + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${pieWidth/2 + margin.left},${pieHeight/2})`);

    // Color scale
    const color = d3.scaleOrdinal()
      .range(['#6c5dd3', '#7a6af0', '#8d7df3', '#a190f6', '#b4a7f9', '#c7befc']);

    // Pie generator
    const pie = d3.pie()
      .value(d => d[1])
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.4) // For donut chart
      .outerRadius(radius * 0.8);

    const outerArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    // Add the paths (slices)
    const slices = pieSvg.selectAll('path')
      .data(pie(Object.entries(quarterlyDeaths)))
      .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data[0]))
        .attr('stroke', '#1f2128')
        .style('stroke-width', '2px')
        .style('opacity', 0.8);

    // Add labels
    const labelGroups = pieSvg.selectAll('g.label')
      .data(pie(Object.entries(quarterlyDeaths)))
      .join('g')
        .attr('class', 'label');

            // Improved label positioning
        labelGroups.append('text')
          .attr('transform', d => {
            const pos = outerArc.centroid(d);
            // Increase the radius multiplier to push labels further out
            pos[0] = radius * 1.2 * (midangle(d) < Math.PI ? 1 : -1);
            // Adjust vertical positioning based on index to prevent overlap
            pos[1] = pos[1] + (d.index - 2) * 20;
            return `translate(${pos})`;
          })
          .attr('dy', '.35em')
          .style('text-anchor', d => midangle(d) < Math.PI ? 'start' : 'end')
          .style('fill', '#808191')
          .style('font-size', '12px')
          .text(d => `${d.data[0]}: ${d3.format('.1%')(d.data[1]/d3.sum(Object.values(quarterlyDeaths)))}`)
          .style('font-weight', 'bold');

        // Adjust polylines to connect to new label positions
        labelGroups.append('polyline')
          .attr('points', d => {
            const pos = outerArc.centroid(d);
            const pos2 = outerArc.centroid(d);
            pos[0] = radius * 1.15 * (midangle(d) < Math.PI ? 1 : -1);
            pos2[0] = radius * 0.95 * (midangle(d) < Math.PI ? 1 : -1);
            pos[1] = pos[1] + (d.index - 2) * 20;
            return [arc.centroid(d), pos2, pos];
          })
          .style('fill', 'none')
          .style('stroke', '#808191')
          .style('stroke-width', '1px')
          .style('opacity', 0.5);

    // Add interactivity
    // Bar chart tooltip
    const barTooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#1f2128')
      .style('color', '#808191')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');

    svg.selectAll('rect')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('fill', '#8677e9');
        
        barTooltip
          .style('visibility', 'visible')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`Month: ${d[0]}<br>Total Cases: ${d3.format(',')(d[1])}`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('fill', '#6c5dd3');
        barTooltip.style('visibility', 'hidden');
      });

    // Pie chart tooltip
    const pieTooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#1f2128')
      .style('color', '#808191')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');

    slices
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('stroke-width', '3px');
        
        pieTooltip
          .style('visibility', 'visible')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`${d.data[0]}<br>Deaths: ${d3.format(',')(d.data[1])}<br>Percentage: ${d3.format('.1%')(d.data[1]/d3.sum(Object.values(quarterlyDeaths)))}`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('stroke-width', '2px');
        pieTooltip.style('visibility', 'hidden');
      });

    // Helper function for pie chart
    function midangle(d) {
      return d.startAngle + (d.endAngle - d.startAngle)/2;
    }
  });