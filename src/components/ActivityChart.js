import React, { Component } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import * as d3 from 'd3';
import uuid from 'uuid';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import constants from '../constants';
import util from '../util';

const formatDatas = tableTasks => tableTasks.reduce((result, current) => {
  const element = result.find(p => p.date === current.date);

  const estimate = current.estimate ? current.estimate : 0;
  const actually = util.getTimeDiffMinute(current.startTime, current.endTime);
  const remaining = (!current.startTime || !current.endTime) && current.estimate ? current.estimate : 0;
  if (element) {
    element.estimates.push(estimate);
    element.actuallys.push(actually);
    element.remainings.push(remaining);
  } else {
    result.push({
      date: current.date,
      estimates: [estimate],
      actuallys: [actually],
      remainings: [remaining],
    });
  }
  return result;
}, []);

const styles = {
  block: {
    fontSize: 22,
    margin: 5,
  },
};
class ActivityChart extends Component {
  constructor(props) {
    super(props);
    this.draw = debounce(this.draw, constants.RENDER_DELAY);
    this.state = {
      id: `${uuid()}`,
    };
  }

  componentWillMount() {
  }

  componentDidMount() {
    if (!this.activity || !Array.isArray(this.props.tableTasks)) return;
    this.draw(formatDatas(this.props.tableTasks));
  }

  componentDidUpdate() {
    if (!this.activity || !Array.isArray(this.props.tableTasks)) return;
    this.draw(formatDatas(this.props.tableTasks));
  }

  componentWillUnmount() {
  }


  draw(datas) {
    d3.selectAll(`#activity-${this.state.id} > *`).remove();
    const padding = 40;
    const width = constants.APPWIDTH - (padding * 2);
    const height = 300;
    const svg = d3.select(`#activity-${this.state.id}`).attr('width', width).attr('height', height);
    const timeparser = d3.timeParse('%Y-%m-%d');

    const dataset = datas.map(data => ({
      date: timeparser(data.date),
      estimate: data.estimates.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / 60,
      actually: data.actuallys.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / 60,
      remaining: data.remainings.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / 60,
    }));

    const xScale = d3.scaleTime()
      .domain([d3.min(dataset, d => moment(d.date).toDate()), d3.max(dataset, d => moment(d.date).toDate())])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dataset, d => Math.max(d.estimate, d.actually, d.remaining))])
      .range([height - padding, padding]);

    const axisx = d3.axisBottom(xScale)
      .ticks(dataset.length)
      .tickFormat(d3.timeFormat('%Y-%m-%d(%a)'));
    const axisy = d3.axisLeft(yScale).tickFormat(d => `${d}h`);

    const estimateLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.estimate));

    const actuallyLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.actually));

    const remainingLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.remaining));

    svg.append('g')
      .attr('transform', `translate(${0},${height - padding})`)
      .call(axisx);

    svg.append('g')
      .attr('transform', `translate(${padding},${0})`)
      .call(axisy);

    // 見積
    svg.append('path')
      .datum(dataset)
      .attr('stroke-width', 1)
      .attr('stroke', constants.brandColor.base.GREEN)
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', estimateLine);

    // 実績
    svg.append('path')
      .datum(dataset)
      .attr('stroke-width', 1)
      .attr('stroke', constants.brandColor.base.BLUE)
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', actuallyLine);

    // 残
    svg.append('path')
      .datum(dataset)
      .attr('stroke-width', 1)
      .attr('stroke', constants.brandColor.base.RED)
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', remainingLine);
  }
  render() {
    const { classes } = this.props;
    return (
      <div>
        <Typography gutterBottom variant="caption">
          見積:<span className={classes.block} style={{ color: constants.brandColor.base.GREEN }}>■</span>(緑色) /
          実績:<span className={classes.block} style={{ color: constants.brandColor.base.BLUE }}>■</span>(青色) /
          残:<span className={classes.block} style={{ color: constants.brandColor.base.RED }}>■</span>(赤色)
        </Typography>
        <svg id={`activity-${this.state.id}`} ref={(node) => { this.activity = node; }} />
      </div>
    );
  }
}

ActivityChart.propTypes = {
  tableTasks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    assign: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    estimate: PropTypes.any.isRequired,
    endTime: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    memo: PropTypes.string.isRequired,
  })).isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles)(ActivityChart);