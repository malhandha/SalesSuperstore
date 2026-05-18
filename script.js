// ===============================
// SUPERSTORE DASHBOARD
// ===============================

const tooltip = d3.select("#tooltip");

// ===============================
// TOOLTIP
// ===============================

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY - 28 + "px");
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// ===============================
// LOAD CSV
// ===============================

d3.csv("data/superstore.csv").then((data) => {

  // ===============================
  // FORMAT DATA
  // ===============================

  data.forEach((d) => {
    d.Sales = +d.Sales || 0;
    d.Profit = +d.Profit || 0;
    d.Discount = +d.Discount || 0;
    d.Quantity = +d.Quantity || 0;
  });

  // ===============================
  // FILTER ELEMENTS
  // ===============================

  const regionFilter = d3.select("#regionFilter");
  const categoryFilter = d3.select("#categoryFilter");

  // ===============================
  // REGION OPTIONS
  // ===============================

  const regions = [...new Set(data.map(d => d.Region))];

  regions.forEach(region => {
    regionFilter
      .append("option")
      .attr("value", region)
      .text(region);
  });

  // ===============================
  // CATEGORY OPTIONS
  // ===============================

  const categories = [...new Set(data.map(d => d.Category))];

  categories.forEach(category => {
    categoryFilter
      .append("option")
      .attr("value", category)
      .text(category);
  });

  // ===============================
  // FILTER EVENTS
  // ===============================

  regionFilter.on("change", applyFilters);
  categoryFilter.on("change", applyFilters);

  // ===============================
  // INITIAL LOAD
  // ===============================

  updateDashboard(data);

  // ===============================
  // APPLY FILTERS
  // ===============================

  function applyFilters() {

    let filtered = data;

    const selectedRegion = regionFilter.property("value");
    const selectedCategory = categoryFilter.property("value");

    if (selectedRegion !== "All") {
      filtered = filtered.filter(
        d => d.Region === selectedRegion
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        d => d.Category === selectedCategory
      );
    }

    updateDashboard(filtered);
  }

  // ===============================
  // UPDATE DASHBOARD
  // ===============================

  function updateDashboard(filtered) {

    updateKPI(filtered);

    createBarChart(filtered);

    createPieChart(filtered);

    drawRadialTree(filtered);

  }

});

// ===============================
// KPI
// ===============================

function updateKPI(data) {

  const totalSales = d3.sum(data, d => d.Sales);

  const totalProfit = d3.sum(data, d => d.Profit);

  const totalOrders = data.length;

  const avgDiscount = d3.mean(data, d => d.Discount);

  d3.select("#totalSales")
    .text("$" + Math.round(totalSales).toLocaleString());

  d3.select("#totalProfit")
    .text("$" + Math.round(totalProfit).toLocaleString());

  d3.select("#totalOrders")
    .text(totalOrders);

  d3.select("#avgDiscount")
    .text((avgDiscount * 100).toFixed(1) + "%");
}

// ===============================
// BAR CHART
// ===============================

function createBarChart(data) {

  const svg = d3.select("#barChart");

  svg.selectAll("*").remove();

  const width = 700;
  const height = 400;

  svg
    .attr("width", width)
    .attr("height", height);

  const margin = {
    top: 20,
    right: 20,
    bottom: 60,
    left: 70
  };

  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Sales),
    d => d.Category
  );

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1])])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // AXIS

  svg.append("g")
    .attr(
      "transform",
      `translate(0,${height - margin.bottom})`
    )
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "#fff");

  svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},0)`
    )
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "#fff");

  // BARS

  svg.selectAll(".bar")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("y", height - margin.bottom)
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("rx", 10)
    .attr("fill", "#8b5cf6")

    .on("mousemove", (event, d) => {

      showTooltip(
        event,
        `
        <strong>${d[0]}</strong>
        <br>
        Sales: $${Math.round(d[1]).toLocaleString()}
        `
      );

    })

    .on("mouseout", hideTooltip)

    .transition()
    .duration(1000)

    .attr("y", d => y(d[1]))
    .attr(
      "height",
      d => height - margin.bottom - y(d[1])
    );

}

// ===============================
// PIE CHART
// ===============================

function createPieChart(data) {

  const svg = d3.select("#pieChart");

  svg.selectAll("*").remove();

  const width = 450;
  const height = 400;

  svg
    .attr("width", width)
    .attr("height", height);

  const radius = 140;

  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Sales),
    d => d.Segment
  );

  const color = d3.scaleOrdinal()
    .range([
      "#38bdf8",
      "#8b5cf6",
      "#c8ff00"
    ]);

  const pie = d3.pie()
    .value(d => d[1]);

  const arc = d3.arc()
    .innerRadius(60)
    .outerRadius(radius);

  const g = svg.append("g")
    .attr(
      "transform",
      `translate(${width / 2},${height / 2})`
    );

  g.selectAll("path")
    .data(pie(grouped))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d, i) => color(i))
    .attr("stroke", "#0f172a")
    .style("stroke-width", "4px")

    .on("mousemove", (event, d) => {

      showTooltip(
        event,
        `
        <strong>${d.data[0]}</strong>
        <br>
        Sales: $${Math.round(d.data[1]).toLocaleString()}
        `
      );

    })

    .on("mouseout", hideTooltip)

    .transition()
    .duration(1000)
    .attrTween("d", function(d) {

      const i = d3.interpolate(
        d.startAngle,
        d.endAngle
      );

      return function(t) {

        d.endAngle = i(t);

        return arc(d);

      };

    });

}

// ===============================
// RADIAL TREE
// ===============================

function drawRadialTree(data) {

  d3.select("#radialTree").html("");

  // ===============================
  // SIZE
  // ===============================

  const width = 1200;
  const height = 900;

  const radius = 320;

  // ===============================
  // SVG
  // ===============================

  const svg = d3.select("#radialTree")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

    // bikin responsive
    .attr("viewBox", `0 0 ${width} ${height}`)

    .append("g")

    // CENTER
    .attr(
      "transform",
      `translate(${width / 2}, ${height / 2})`
    );

  // ===============================
  // HIERARCHY
  // ===============================

  const hierarchyData = {
    name: "Superstore",
    children: []
  };

  const regionMap = d3.group(
    data,
    d => d.Region,
    d => d.Category,
    d => d["Sub-Category"]
  );

  regionMap.forEach((catMap, region) => {

    const regionNode = {
      name: region,
      children: []
    };

    catMap.forEach((subMap, category) => {

      const categoryNode = {
        name: category,
        children: []
      };

      subMap.forEach((items, subCategory) => {

        const totalProfit = d3.sum(
          items,
          d => d.Profit
        );

        categoryNode.children.push({
          name: subCategory,
          value: Math.round(totalProfit)
        });

      });

      regionNode.children.push(categoryNode);

    });

    hierarchyData.children.push(regionNode);

  });

  // ===============================
  // TREE LAYOUT
  // ===============================

  const root = d3.hierarchy(hierarchyData);

  const tree = d3.tree()
    .size([2 * Math.PI, radius]);

  tree(root);

  // ===============================
  // LINKS
  // ===============================

  svg.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr(
      "d",
      d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y)
    )
    .attr("fill", "none")
    .attr("stroke", "#334155")
    .attr("stroke-width", 1.2);

  // ===============================
  // COLOR
  // ===============================

  const color = d3.scaleOrdinal()
    .domain([
      "Furniture",
      "Office Supplies",
      "Technology"
    ])
    .range([
      "#c8ff00",
      "#8b5cf6",
      "#38bdf8"
    ]);

  // ===============================
  // NODES
  // ===============================

  const node = svg.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `
      rotate(${d.x * 180 / Math.PI - 90})
      translate(${d.y},0)
    `);

  node.append("circle")
    .attr("r", d => {

      if (d.depth === 0) return 12;
      if (d.depth === 1) return 9;
      if (d.depth === 2) return 7;

      return 4;

    })

    .attr("fill", d => {

      if (d.depth === 0)
        return "#ffffff";

      if (d.depth === 1)
        return "#94a3b8";

      if (d.depth === 2)
        return color(d.data.name);

      if (d.depth === 3)
        return color(d.parent.data.name);

      return "#cbd5e1";

    })

    .on("mousemove", (event, d) => {

      showTooltip(
        event,
        `
        <strong>${d.data.name}</strong>
        <br>
        ${
          d.data.value
            ? `Profit: $${d.data.value.toLocaleString()}`
            : "Hierarchy Node"
        }
        `
      );

    })

    .on("mouseout", hideTooltip);

  // ===============================
  // LABELS
  // ===============================

  node.append("text")
    .attr("dy", "0.31em")

    .attr(
      "x",
      d => d.x < Math.PI ? 10 : -10
    )

    .attr(
      "text-anchor",
      d => d.x < Math.PI ? "start" : "end"
    )

    .attr(
      "transform",
      d => d.x >= Math.PI
        ? "rotate(180)"
        : null
    )

    .text(d => d.data.name)

    .style("fill", "#e2e8f0")

    .style("font-size", d => {

      if (d.depth === 1)
        return "16px";

      if (d.depth === 2)
        return "13px";

      return "11px";

    })

    .style(
      "font-weight",
      d => d.depth <= 1 ? "700" : "400"
    );

}
