// COVID-19 Dashboard Charts
// Using disease.sh API: https://disease.sh/v3/covid-19/historical

// Chart colors
const colors = {
  cases: '#6C5DD3',
  deaths: '#FF754C',
  recovered: '#7FBA7A',
  active: '#FFCE73',
  global: '#A0D7E7'
};

// Global variables
let covidData = {};
let currentCountry = 'all';
let currentMetric = 'cases';
let currentView = 'all';

// Initialize charts
document.addEventListener('DOMContentLoaded', function() {
  loadCovidData();
  setupEventListeners();
  
  // Handle window resize with debouncing
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      createLineChart();
      createBarChart();
      createMultiChart();
      createPieChart();
    }, 250);
  });
});

// Load COVID-19 data from API
async function loadCovidData() {
  try {
    // Load global data
    const globalResponse = await fetch('https://disease.sh/v3/covid-19/historical/all?lastdays=365');
    const globalData = await globalResponse.json();
    
    // Load country data
    const countries = ['USA', 'India', 'Brazil'];
    const countryPromises = countries.map(country => 
      fetch(`https://disease.sh/v3/covid-19/historical/${country}?lastdays=365`)
        .then(response => response.json())
        .catch(() => null)
    );
    
    const countryData = await Promise.all(countryPromises);
    
    covidData = {
      global: processGlobalData(globalData),
      countries: {}
    };
    
    countries.forEach((country, index) => {
      if (countryData[index]) {
        covidData.countries[country] = processCountryData(countryData[index]);
      }
    });
    
    // Initialize charts with a small delay to ensure containers are sized
    setTimeout(() => {
      createLineChart();
      createBarChart();
      createMultiChart();
      createPieChart();
    }, 100);
    
  } catch (error) {
    console.error('Error loading COVID-19 data:', error);
    // Fallback to sample data if API fails
    loadSampleData();
  }
}

// Process global data to fix recovered values
function processGlobalData(data) {
  const processed = { ...data };
  
  // Calculate recovered as cases - deaths if recovered is zero or unreliable
  if (processed.cases && processed.deaths) {
    const dates = Object.keys(processed.cases);
    processed.recovered = {};
    
    dates.forEach(date => {
      const cases = processed.cases[date] || 0;
      const deaths = processed.deaths[date] || 0;
      const apiRecovered = processed.recovered?.[date] || 0;
      
      // Use API recovered if it's reasonable, otherwise calculate
      if (apiRecovered > 0 && apiRecovered <= cases) {
        processed.recovered[date] = apiRecovered;
      } else {
        // Calculate as cases - deaths, with a minimum of 0
        processed.recovered[date] = Math.max(0, cases - deaths);
      }
    });
  }
  
  return processed;
}

// Process country data to fix recovered values
function processCountryData(data) {
  if (!data.timeline) return data;
  
  const processed = { ...data };
  const timeline = { ...data.timeline };
  
  // Calculate recovered as cases - deaths if recovered is zero or unreliable
  if (timeline.cases && timeline.deaths) {
    const dates = Object.keys(timeline.cases);
    timeline.recovered = {};
    
    dates.forEach(date => {
      const cases = timeline.cases[date] || 0;
      const deaths = timeline.deaths[date] || 0;
      const apiRecovered = timeline.recovered?.[date] || 0;
      
      // Use API recovered if it's reasonable, otherwise calculate
      if (apiRecovered > 0 && apiRecovered <= cases) {
        timeline.recovered[date] = apiRecovered;
      } else {
        // Calculate as cases - deaths, with a minimum of 0
        timeline.recovered[date] = Math.max(0, cases - deaths);
      }
    });
  }
  
  processed.timeline = timeline;
  return processed;
}

// Fallback sample data
function loadSampleData() {
  const dates = [];
  const today = new Date();
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  const sampleCases = Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 1000000)]));
  const sampleDeaths = Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 50000)]));
  const sampleRecovered = Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 800000)]));
  
  covidData = {
    global: {
      cases: sampleCases,
      deaths: sampleDeaths,
      recovered: sampleRecovered
    },
    countries: {
      USA: {
        timeline: {
          cases: Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 500000)])),
          deaths: Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 25000)])),
          recovered: Object.fromEntries(dates.map(date => [date, Math.floor(Math.random() * 400000)]))
        }
      }
    }
  };
  
  setTimeout(() => {
    createLineChart();
    createBarChart();
    createMultiChart();
    createPieChart();
  }, 100);
}

// Setup event listeners for chart controls
function setupEventListeners() {
  // Line chart country buttons
  document.querySelectorAll('[data-country]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-country]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentCountry = this.dataset.country;
      updateLineChart();
    });
  });
  
  // Bar chart metric buttons
  document.querySelectorAll('[data-metric]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-metric]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMetric = this.dataset.metric;
      updateBarChart();
    });
  });
  
  // Multi chart view buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentView = this.dataset.view;
      updateMultiChart();
    });
  });
}

// Create line chart
function createLineChart() {
  const container = d3.select('#covid-line-chart');
  
  // Wait for container to be properly sized
  setTimeout(() => {
    const containerRect = container.node().getBoundingClientRect();
    
    // Use the actual container dimensions with responsive approach
    const containerWidth = containerRect.width || container.node().offsetWidth || 800;
    const containerHeight = containerRect.height || container.node().offsetHeight || 600;
    
    // Responsive margins that scale with container size
    const margin = {
      top: Math.max(20, containerHeight * 0.08),
      right: Math.max(30, containerWidth * 0.05),
      bottom: Math.max(40, containerHeight * 0.12),
      left: Math.max(60, containerWidth * 0.08)
    };
    
    const width = Math.max(containerWidth - margin.left - margin.right, 300);
    const height = Math.max(containerHeight - margin.top - margin.bottom, 300);
    
    // Clear existing chart
    container.selectAll('*').remove();
    
    const svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get data based on selected country
    let data = [];
    if (currentCountry === 'all' && covidData.global) {
      data = Object.entries(covidData.global.cases).map(([date, cases]) => ({
        date: new Date(date),
        cases: cases
      }));
    } else if (covidData.countries[currentCountry]) {
      data = Object.entries(covidData.countries[currentCountry].timeline.cases).map(([date, cases]) => ({
        date: new Date(date),
        cases: cases
      }));
    }
    
    if (data.length === 0) return;
    
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cases)])
      .range([height, 0]);
    
    // Line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.cases))
      .curve(d3.curveMonotoneX);
    
    // Add line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.cases)
      .attr('stroke-width', Math.max(2, width / 200))
      .attr('d', line);
    
    // Add dots (responsive number based on width)
    const dotSpacing = Math.max(30, width / 20);
    svg.selectAll('.dot')
      .data(data.filter((d, i) => i % Math.floor(data.length / (width / dotSpacing)) === 0))
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.cases))
      .attr('r', Math.max(3, width / 150))
      .attr('fill', colors.cases)
      .attr('stroke', 'white')
      .attr('stroke-width', Math.max(1, width / 300));
    
    // Add axes with responsive ticks
    const xTicks = Math.max(3, Math.floor(width / 150));
    const yTicks = Math.max(3, Math.floor(height / 80));
    
    const xAxis = d3.axisBottom(xScale).ticks(xTicks);
    const yAxis = d3.axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat(d => {
        if (d >= 1e9) return (d / 1e9).toFixed(1) + 'B';
        if (d >= 1e6) return (d / 1e6).toFixed(1) + 'M';
        if (d >= 1e3) return (d / 1e3).toFixed(1) + 'K';
        return d.toLocaleString();
      });
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    svg.append('g')
      .call(yAxis);
    
    // Add legend
    const legendData = [
      { label: 'Total Cases', color: colors.cases }
    ];
    
    const legendSpacing = Math.max(15, width / 30);
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 20)`);
    
    const legendRectSize = Math.max(12, width / 100);
    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * legendSpacing})`)
      .each(function(d) {
        const g = d3.select(this);
        
        // Add legend line
        g.append('line')
          .attr('x1', 0)
          .attr('y1', legendRectSize / 2)
          .attr('x2', legendRectSize)
          .attr('y2', legendRectSize / 2)
          .attr('stroke', d.color)
          .attr('stroke-width', Math.max(2, width / 200));
        
        // Add legend dot
        g.append('circle')
          .attr('cx', legendRectSize / 2)
          .attr('cy', legendRectSize / 2)
          .attr('r', Math.max(3, width / 150))
          .attr('fill', d.color)
          .attr('stroke', 'white')
          .attr('stroke-width', Math.max(1, width / 300));
        
        // Add legend text
        g.append('text')
          .attr('x', legendRectSize + 8)
          .attr('y', legendRectSize / 2)
          .attr('dy', '0.35em')
          .style('font-size', `${Math.max(10, width / 80)}px`)
          .style('font-weight', '500')
          .text(d.label);
      });
    
    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    
    // Add hover area
    const hoverArea = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', function() {
        tooltip.style('opacity', 1);
      })
      .on('mouseout', function() {
        tooltip.style('opacity', 0);
      })
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);
        const bisector = d3.bisector(d => d.date).left;
        const i = bisector(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        
        tooltip
          .html(`<strong>${d.date.toLocaleDateString()}</strong><br/>Cases: ${d.cases.toLocaleString()}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      });
  }, 50);
}

// Update line chart
function updateLineChart() {
  createLineChart();
}

// Create bar chart
function createBarChart() {
  const container = d3.select('#covid-bar-chart');
  
  // Wait for container to be properly sized
  setTimeout(() => {
    const containerRect = container.node().getBoundingClientRect();
    
    // Use the actual container dimensions with responsive approach
    const containerWidth = containerRect.width || container.node().offsetWidth || 800;
    const containerHeight = containerRect.height || container.node().offsetHeight || 600;
    
    // Responsive margins that scale with container size
    const margin = {
      top: Math.max(20, containerHeight * 0.08),
      right: Math.max(30, containerWidth * 0.05),
      bottom: Math.max(50, containerHeight * 0.15),
      left: Math.max(60, containerWidth * 0.08)
    };
    
    const width = Math.max(containerWidth - margin.left - margin.right, 300);
    const height = Math.max(containerHeight - margin.top - margin.bottom, 300);
    
    // Clear existing chart
    container.selectAll('*').remove();
    
    const svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get data
    let data = [];
    if (covidData.global) {
      const entries = Object.entries(covidData.global[currentMetric] || covidData.global.cases);
      data = entries.slice(-60).map(([date, value]) => ({
        date: new Date(date),
        value: value
      })).sort((a, b) => a.date - b.date); // Ensure chronological order
    }
    
    if (data.length === 0) return;
    
    // Calculate daily differences (new cases per day)
    const dailyData = data.map((d, i) => {
      if (i === 0) return { date: d.date, value: 0 }; // First day has no previous day to compare
      const todayValue = d.value;
      const yesterdayValue = data[i-1].value;
      return { date: d.date, value: Math.max(0, todayValue - yesterdayValue) };
    }).filter(d => d.value > 0 && d.date > new Date('2020-03-01')); // Filter out zero values and very early dates
    
    // Scales
    const xScale = d3.scaleBand()
      .domain(dailyData.map(d => d.date))
      .range([0, width])
      .padding(0.1);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dailyData, d => d.value)])
      .range([height, 0]);
    
    // Add bars
    svg.selectAll('.bar')
      .data(dailyData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.date))
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.value))
      .attr('fill', colors.cases)
      .attr('rx', Math.max(2, width / 200))
      .attr('ry', Math.max(2, width / 200));
    
    // Add axes with responsive ticks
    const xTicks = Math.max(5, Math.floor(width / 100));
    const yTicks = Math.max(3, Math.floor(height / 80));
    
    const xAxis = d3.axisBottom(xScale)
      .tickValues(dailyData.filter((d, i) => i % Math.max(1, Math.floor(dailyData.length / xTicks)) === 0).map(d => d.date))
      .tickFormat(d3.timeFormat('%b %d'));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat(d => {
        if (d >= 1e9) return (d / 1e9).toFixed(1) + 'B';
        if (d >= 1e6) return (d / 1e6).toFixed(1) + 'M';
        if (d >= 1e3) return (d / 1e3).toFixed(1) + 'K';
        return d.toLocaleString();
      });
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    svg.append('g')
      .call(yAxis);
    
    // Add legend
    const metricLabels = {
      cases: 'Daily New Cases',
      deaths: 'Daily New Deaths',
      recovered: 'Daily New Recovered'
    };
    
    const legendData = [
      { label: metricLabels[currentMetric] || 'Daily New Cases', color: colors.cases }
    ];
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendRectSize = Math.max(12, width / 100);
    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .each(function(d) {
        const g = d3.select(this);
        
        // Add legend rectangle
        g.append('rect')
          .attr('width', legendRectSize)
          .attr('height', legendRectSize)
          .attr('fill', d.color)
          .attr('rx', Math.max(2, width / 200))
          .attr('ry', Math.max(2, width / 200));
        
        // Add legend text
        g.append('text')
          .attr('x', legendRectSize + 8)
          .attr('y', legendRectSize / 2)
          .attr('dy', '0.35em')
          .style('font-size', `${Math.max(10, width / 80)}px`)
          .style('font-weight', '500')
          .text(d.label);
      });
    
    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    
    // Add hover effects
    svg.selectAll('.bar')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', d3.color(colors.cases).brighter(0.3));
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`<strong>${d.date.toLocaleDateString()}</strong><br/>New ${currentMetric}: ${d.value.toLocaleString()}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(d) {
        d3.select(this).attr('fill', colors.cases);
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }, 50);
}

// Update bar chart
function updateBarChart() {
  createBarChart();
}

// Create multi-line chart
function createMultiChart() {
  const container = d3.select('#covid-multi-chart');
  
  // Wait for container to be properly sized
  setTimeout(() => {
    const containerRect = container.node().getBoundingClientRect();
    
    // Use the actual container dimensions with responsive approach
    const containerWidth = containerRect.width || container.node().offsetWidth || 800;
    const containerHeight = containerRect.height || container.node().offsetHeight || 600;
    
    // Responsive margins that scale with container size
    const margin = {
      top: Math.max(20, containerHeight * 0.08),
      right: Math.max(30, containerWidth * 0.05),
      bottom: Math.max(40, containerHeight * 0.12),
      left: Math.max(60, containerWidth * 0.08)
    };
    
    const width = Math.max(containerWidth - margin.left - margin.right, 300);
    const height = Math.max(containerHeight - margin.top - margin.bottom, 300);
    
    // Clear existing chart
    container.selectAll('*').remove();
    
    const svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get data
    let data = [];
    if (covidData.global) {
      const dates = Object.keys(covidData.global.cases);
      data = dates.map(date => ({
        date: new Date(date),
        cases: covidData.global.cases[date] || 0,
        deaths: covidData.global.deaths?.[date] || 0,
        recovered: covidData.global.recovered?.[date] || 0
      }));
    }
    
    if (data.length === 0) return;
    
    // Filter data based on view
    const metrics = currentView === 'all' ? ['cases', 'deaths', 'recovered'] : [currentView];
    
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(...metrics.map(metric => d[metric])))])
      .range([height, 0]);
    
    // Line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => d.value)
      .curve(d3.curveMonotoneX);
    
    // Create lines for each metric
    metrics.forEach((metric, index) => {
      const metricData = data.map(d => ({
        date: d.date,
        value: yScale(d[metric])
      }));
      
      svg.append('path')
        .datum(metricData)
        .attr('fill', 'none')
        .attr('stroke', colors[metric])
        .attr('stroke-width', Math.max(2, width / 200))
        .attr('d', line);
    });
    
    // Add axes with responsive ticks
    const xTicks = Math.max(3, Math.floor(width / 150));
    const yTicks = Math.max(3, Math.floor(height / 80));
    
    const xAxis = d3.axisBottom(xScale).ticks(xTicks);
    const yAxis = d3.axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat(d => {
        if (d >= 1e9) return (d / 1e9).toFixed(1) + 'B';
        if (d >= 1e6) return (d / 1e6).toFixed(1) + 'M';
        if (d >= 1e3) return (d / 1e3).toFixed(1) + 'K';
        return d.toLocaleString();
      });
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    svg.append('g')
      .call(yAxis);
    
    // Add legend
    const metricLabels = {
      cases: 'Total Cases',
      deaths: 'Total Deaths',
      recovered: 'Total Recovered'
    };
    
    const legendData = metrics.map(metric => ({
      label: metricLabels[metric] || metric.charAt(0).toUpperCase() + metric.slice(1),
      color: colors[metric]
    }));
    
    const legendSpacing = Math.max(15, width / 30);
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 20)`);
    
    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * legendSpacing})`)
      .each(function(d) {
        const g = d3.select(this);
        
        // Add legend line
        g.append('line')
          .attr('x1', 0)
          .attr('y1', 6)
          .attr('x2', 20)
          .attr('y2', 6)
          .attr('stroke', d.color)
          .attr('stroke-width', Math.max(2, width / 200));
        
        // Add legend text
        g.append('text')
          .attr('x', 25)
          .attr('y', 6)
          .attr('dy', '0.35em')
          .style('font-size', `${Math.max(10, width / 80)}px`)
          .style('font-weight', '500')
          .text(d.label);
      });
    
    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    
    // Add hover area with improved detection
    const hoverArea = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', function() {
        tooltip.style('opacity', 1);
      })
      .on('mouseout', function() {
        tooltip.style('opacity', 0);
      })
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);
        const bisector = d3.bisector(d => d.date).left;
        const i = bisector(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        
        let tooltipContent = `<strong>${d.date.toLocaleDateString()}</strong><br/>`;
        metrics.forEach(metric => {
          tooltipContent += `${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${d[metric].toLocaleString()}<br/>`;
        });
        
        tooltip
          .html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      });
  }, 50);
}

// Update multi chart
function updateMultiChart() {
  createMultiChart();
}

// Create pie chart
function createPieChart() {
  const container = d3.select('#covid-pie-chart');
  
  // Wait for container to be properly sized
  setTimeout(() => {
    const containerRect = container.node().getBoundingClientRect();
    
    // Use the actual container dimensions with responsive approach
    const containerWidth = containerRect.width || container.node().offsetWidth || 600;
    const containerHeight = containerRect.height || container.node().offsetHeight || 600;
    
    // Responsive margins that scale with container size
    const margin = {
      top: Math.max(20, containerHeight * 0.08),
      right: Math.max(20, containerWidth * 0.05),
      bottom: Math.max(30, containerHeight * 0.1),
      left: Math.max(20, containerWidth * 0.05)
    };
    
    const width = Math.max(containerWidth - margin.left - margin.right, 300);
    const height = Math.max(containerHeight - margin.top - margin.bottom, 300);
    const radius = Math.min(width, height) / 2.2; // Slightly larger radius for better visibility
    
    // Clear existing chart
    container.selectAll('*').remove();
    
    const svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${width/2 + margin.left},${height/2 + margin.top})`);
    
    // Get latest data
    let data = [];
    if (covidData.global) {
      const dates = Object.keys(covidData.global.cases);
      const latestDate = dates[dates.length - 1];
      
      const cases = covidData.global.cases[latestDate] || 0;
      const deaths = covidData.global.deaths?.[latestDate] || 0;
      const recovered = covidData.global.recovered?.[latestDate] || 0;
      const active = Math.max(0, cases - deaths - recovered);
      
      data = [
        { label: 'Active', value: active, color: colors.active },
        { label: 'Recovered', value: recovered, color: colors.recovered },
        { label: 'Deaths', value: deaths, color: colors.deaths }
      ].filter(d => d.value > 0);
    }
    
    if (data.length === 0) return;
    
    // Create pie chart
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const outerArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);
    
    // Create slices
    const slices = svg.selectAll('.slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'slice');
    
    slices.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', Math.max(1, radius / 50));
    
    // Add labels with responsive font size
    const fontSize = Math.max(8, radius / 15);
    slices.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', `${fontSize}px`)
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => d.data.label);
    
    // Add legend with responsive positioning
    const legendSpacing = Math.max(15, radius / 8);
    const legend = svg.selectAll('.legend')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${radius + 20}, ${i * legendSpacing - legendSpacing})`);
    
    const legendRectSize = Math.max(8, radius / 20);
    legend.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .attr('fill', d => d.color);
    
    legend.append('text')
      .attr('x', legendRectSize + 5)
      .attr('y', legendRectSize / 2)
      .attr('dy', '0.35em')
      .style('font-size', `${Math.max(10, radius / 25)}px`)
      .text(d => `${d.label}: ${d.value.toLocaleString()}`);
    
    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    
    // Add hover effects
    slices.selectAll('path')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', Math.max(2, radius / 25));
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`<strong>${d.data.label}</strong><br/>Value: ${d.data.value.toLocaleString()}<br/>Percentage: ${((d.data.value / d3.sum(data, d => d.value)) * 100).toFixed(1)}%`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(d) {
        d3.select(this).attr('stroke-width', Math.max(1, radius / 50));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }, 50);
}

// Update pie chart
function updatePieChart() {
  createPieChart();
} 