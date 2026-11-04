import React from 'react';
import ErrorPage from '../pages/ErrorPage';
export default class StoreErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidUpdate(previous){if(this.state.failed&&previous.resetKey!==this.props.resetKey)this.setState({failed:false});}
 render(){return this.state.failed?<ErrorPage kind="unavailable" onRetry={()=>window.location.reload()}/>:this.props.children;}
}
