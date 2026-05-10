// script.js

d3.csv("data/superstore.csv").then((data) => {
  data.forEach((d) => {
    d.Sales = +d.Sales;
    d.Profit = +d.Profit;
    d.Discount = +d.Discount;
    d.Quantity = +d.Quantity;
  });

  const regionFilter = d3.select("#regionFilter");
  const categoryFilter = d3.select("#categoryFilter");

  // REGION FILTER
  const regions = [...new Set(data.map((d) => d.Region))];

  regions.forEach((region) => {
    regionFilter.append("option").attr("value", region).text(region);
  });

  // CATEGORY FILTER
  const categories = [...new Set(data.map((d) => d.Category))];

  categories.forEach((category) => {
    categoryFilter.append("option").attr("value", category).text(category);
  });

  updateDashboard(data);

  regionFilter.on("change", applyFilters);
  categoryFilter.on("change", applyFilters);

  function applyFilters() {
    let filtered = data;

    const selectedRegion = regionFilter.property("value");
    const selectedCategory = categoryFilter.property("value");

    if (selectedRegion !== "All") {
      filtered = filtered.filter((d) => d.Region === selectedRegion);
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter((d) => d.Category === selectedCategory);
    }

    updateDashboard(filtered);
  }

  function updateDashboard(filtered) {
    updateKPI(filtered);

    createBarChart(filtered);

    createPieChart(filtered);

    createLineChart(filtered);

    createRegionChart(filtered);

    createProductChart(filtered);

    updateInsights(filtered);
  }
});

const tooltip = d3.select("#tooltip");

function showTooltip(event, text) {
  tooltip
    .style("opacity", 1)
    .html(text)
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY - 28 + "px");
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function updateKPI(data) {
  const totalSales = d3.sum(data, (d) => d.Sales);

  const totalProfit = d3.sum(data, (d) => d.Profit);

  const totalOrders = data.length;

  const avgDiscount = d3.mean(data, (d) => d.Discount);

  d3.select("#totalSales").text("$" + Math.round(totalSales).toLocaleString());

  d3.select("#totalProfit").text(
    "$" + Math.round(totalProfit).toLocaleString()
  );

  d3.select("#totalOrders").text(totalOrders);

  d3.select("#avgDiscount").text((avgDiscount * 100).toFixed(1) + "%");
}

function createBarChart(data) {
  const svg = d3.select("#barChart");

  svg.selectAll("*").remove();

  const width = 700;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 50, left: 70 };

  const grouped = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Sales),
    (d) => d.Category
  );

  const x = d3
    .scaleBand()
    .domain(grouped.map((d) => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, (d) => d[1])])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "white");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "white");

  svg
    .selectAll(".bar")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d[0]))
    .attr("y", height - margin.bottom)
    .attr("width", x.bandwidth())
    .attr("height", 0)

    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
        <b>${d[0]}</b><br>
        Sales: $${Math.round(d[1]).toLocaleString()}
      `
      );
    })

    .on("mouseout", hideTooltip)

    .transition()
    .duration(1000)

    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => height - margin.bottom - y(d[1]));
}

function createPieChart(data) {
  const svg = d3.select("#pieChart");

  svg.selectAll("*").remove();

  const width = 450;
  const height = 400;
  const radius = 150;

  const grouped = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Sales),
    (d) => d.Segment
  );

  const color = d3.scaleOrdinal().range(["#38bdf8", "#8b5cf6", "#998ef9 "]);

  const pie = d3.pie().value((d) => d[1]);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  g.selectAll("path")
    .data(pie(grouped))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d, i) => color(i))
    .attr("stroke", "#020617")
    .style("stroke-width", "3px")

    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `
        <b>${d.data[0]}</b><br>
        Sales: $${Math.round(d.data[1]).toLocaleString()}
      `
      );
    })

    .on("mouseout", hideTooltip)

    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);

      return function (t) {
        d.endAngle = i(t);
        return arc(d);
      };
    });
}

function createLineChart(data) {
  const svg = d3.select("#lineChart");

  svg.selectAll("*").remove();

  const width = 1200;
  const height = 400;

  const margin = { top: 20, right: 30, bottom: 50, left: 70 };

  const parseDate = d3.timeParse("%m/%d/%Y");

  data.forEach((d) => {
    d.date = parseDate(d["Order Date"]);
  });

  const monthly = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Profit),
    (d) => d3.timeMonth(d.date)
  );

  monthly.sort((a, b) => a[0] - b[0]);

  const x = d3
    .scaleTime()
    .domain(d3.extent(monthly, (d) => d[0]))
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(monthly, (d) => d[1])])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
    .selectAll("text")
    .style("fill", "white");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "white");

  const line = d3
    .line()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]))
    .curve(d3.curveMonotoneX);

  const path = svg
    .append("path")
    .datum(monthly)
    .attr("class", "line")
    .attr("d", line);

  const length = path.node().getTotalLength();

  path
    .attr("stroke-dasharray", length + " " + length)
    .attr("stroke-dashoffset", length)
    .transition()
    .duration(2000)
    .attr("stroke-dashoffset", 0);
}

function createRegionChart(data) {
  const svg = d3.select("#regionChart");

  svg.selectAll("*").remove();

  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 100 };

  const grouped = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Sales),
    (d) => d.Region
  );

  const y = d3
    .scaleBand()
    .domain(grouped.map((d) => d[0]))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, (d) => d[1])])
    .nice()
    .range([margin.left, width - margin.right]);

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "white");

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "white");

  svg
    .selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", margin.left)
    .attr("y", (d) => y(d[0]))
    .attr("height", y.bandwidth())
    .attr("width", 0)
    .attr("fill", "#8b5cf6")

    .transition()
    .duration(1000)

    .attr("width", (d) => x(d[1]) - margin.left);
}

function createProductChart(data) {
  const svg = d3.select("#productChart");

  svg.selectAll("*").remove();

  const width = 700;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 120, left: 70 };

  let grouped = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.Sales),
    (d) => d["Product Name"]
  );

  grouped = grouped.sort((a, b) => b[1] - a[1]).slice(0, 5);

  const x = d3
    .scaleBand()
    .domain(grouped.map((d) => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, (d) => d[1])])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "white")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "white");

  svg
    .selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d[0]))
    .attr("y", (d) => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - margin.bottom - y(d[1]))
    .attr("fill", "#06b6d4");
}

function updateInsights(data) {
  const topCategory = d3
    .rollups(
      data,
      (v) => d3.sum(v, (d) => d.Sales),
      (d) => d.Category
    )
    .sort((a, b) => b[1] - a[1])[0][0];

  const bestSegment = d3
    .rollups(
      data,
      (v) => d3.sum(v, (d) => d.Sales),
      (d) => d.Segment
    )
    .sort((a, b) => b[1] - a[1])[0][0];

  const topRegion = d3
    .rollups(
      data,
      (v) => d3.sum(v, (d) => d.Profit),
      (d) => d.Region
    )
    .sort((a, b) => b[1] - a[1])[0][0];

  d3.select("#topCategory").text(topCategory);

  d3.select("#bestSegment").text(bestSegment);

  d3.select("#topRegion").text(topRegion);
}
