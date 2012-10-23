(function(window, undefined){
	// VARS
	var JSONPincrement = 0;
	var CurrencyChart = function(){
		this.initialize.apply(this,arguments);
	};
	var chartProto = CurrencyChart.prototype;
	var defaultOptions = {
		wrapper:'.content',
		charContainer:'chart-container',// box #ID
		refreshTimeSelect:'.refresh-time',
		currSelect1:'.currency-1',
		currSelect2:'.currency-2',
		showPeriodSelect:'.show-period',
		applyBtn:'.btn-apply',
		currencies1:'EUR',
		currencies2:'USD',
		showPeriodOnLoad:1,// in minutes
		refreshTime:1,// in seconds
		maxExchTimeIndent:10*60*1000// in ms
		
	};
	// EXTEND CHART PROTO
	chartProto.initialize=function(options){// INIT
		this.setOptions(options);
		this.url = chartProto.utils.clone(chartProto.url);
		this.addJSONP();
		this.applySettings();
		this.setEvents();
		this.getPastData();
	};
	// PROTO VARS
	chartProto.url = {// URL
		urlGetPastData :
			'http://query.yahooapis.com/v1/public/yql?q='+
			encodeURIComponent("select * from xml where url='http://chartapi.finance.yahoo.com/instrument/1.0/{{currencies}}=x/chartdata;type=quote;range=1d'")+
			'&format=json&callback='
		,
		urlGetNowData :
			'http://query.yahooapis.com/v1/public/yql?q='+
			encodeURIComponent("select * from yahoo.finance.xchange where pair in ('{{currencies}}')")+
			"&env=store://datatables.org/alltableswithkeys"+
			'&format=json&callback='
	};
	// PROTO METHODS
	chartProto.utils = {// UTILS
		log : function(msg){
			if(this.isPropExist(window,'console.log')){
				console.log(msg);
			}
		},
		queryToUTCMs : function(timeString){
			var createTimeArr = timeString.split(/\-|:|T|Z/);
			createTimeArr[1]=Number(createTimeArr[1])-1;// to JS month view
			return Date.UTC.apply(Date,createTimeArr);
		},
		isPropExist : function(obj,prop_string){
			var parts = prop_string.split('.');
			var partsLeng = parts.length;
			var i = 0;
			var lastCheckingPart = obj[parts[i]];
			if(!lastCheckingPart){
				return false;
			}
			for(i=1;i<partsLeng;i++){
				lastCheckingPart = lastCheckingPart[parts[i]];
				if(!lastCheckingPart){
					return false;
				}
			}
			return true;
		},
		clone : function(obj) {
			return JSON.parse(JSON.stringify(obj));
		}
	};
	chartProto.addJSONP = function(){
		this.JSONP = {
			get: function(url,callback){
				var _this = this;
				url = url || '';
				callback = callback || function(){};
				var generatedFuncName = 'jsonp' + (++JSONPincrement);
				window[generatedFuncName] = function(json){
					callback(json);
					_this.clean(generatedFuncName);
				};
				this.inProgress[generatedFuncName] = 1;// for indicate
				var jsonpScript = document.createElement('script');
				jsonpScript.setAttribute("src", url+generatedFuncName);
				jsonpScript.setAttribute("id", generatedFuncName);
				document.getElementsByTagName("head")[0].appendChild(jsonpScript);
				return generatedFuncName;
			},
			clean: function(generatedFuncName){
				window[generatedFuncName] = function(){};// not "delete window[generatedFuncName];" for prevent ReferenceError error
				delete this.inProgress[generatedFuncName];
				var _script = document.getElementById(generatedFuncName);
				if(_script){
					_script.setAttribute("src",'');
					_script.parentNode.removeChild(_script);
				}
			},
			cleanAll: function(){
				for(var i in this.inProgress){
					this.clean(i);
				}
			},
			inProgress:{}
		}
	};
	if(typeof window.addEventListener === 'function'){// utils.addListener
		chartProto.addListener = function(el,type,handler){
			el.addEventListener(type,handler,false);
		}
	}else if(typeof document.attachEvent === 'function'){
		chartProto.addListener = function(el,type,handler){
			el.attachEvent('on'+type,handler);
		}
	}else{
		chartProto.addListener = function(el,type,handler){
			el['on'+type]=handler;
		}
	}
	chartProto.setOptions = function(options){
		var _options = chartProto.utils.clone(defaultOptions);
		for(var i in options){
			_options[i] = options[i];
		}
		this.charContainer = _options.charContainer;
		this.wrapper = document.querySelector(_options.wrapper);
		var wrapper = this.wrapper;
		this.currSelect1 = wrapper.querySelector(_options.currSelect1);
		this.currSelect2 = wrapper.querySelector(_options.currSelect2);
		this.refreshTimeSelect = wrapper.querySelector(_options.refreshTimeSelect);
		this.showPeriodSelect = wrapper.querySelector(_options.showPeriodSelect);
		this.applyBtn = wrapper.querySelector(_options.applyBtn);
	};
	chartProto.setEvents = function(){
		var _this = this;
		_this.addListener(_this.applyBtn,'click',function(e){
			e = e || window.event;
			if(typeof e.preventDefault === 'function'){
				e.preventDefault();
			}else{
				e.returnValue = false;
			}
			_this.JSONP.cleanAll();// abort all current requests
			_this.applySettings();
			_this.getPastData();
		});
	};
	// COMMON
	chartProto.setTimer=function(){
		var _this = this;
		clearTimeout(_this.timerId);
		this.timerId = setTimeout(function(){
			_this.getNowData();
			_this.setTimer();
		},this.refreshTime);
	};
	chartProto.addPoint=function(x,y){
		this.chart.series[0].addPoint([x, y], true, true);
	};
	chartProto.getNowData=function(){
		var _this = this;
		this.JSONP.get(
			_this.url.urlGetNowData,
			function(data) {
				if(
					_this.utils.isPropExist(data,'query.results.rate.Rate')
					&& _this.utils.isPropExist(data,'query.created')
				){
					var createUTCMs = _this.utils.queryToUTCMs(data.query.created);
					var rate = Number(data.query.results.rate.Rate);
					_this.addPoint(createUTCMs,rate);
				}
			}
		);
	};
	chartProto.getPastData=function(){
		var _this = this;
		this.JSONP.get(
			_this.url.urlGetPastData,
			function(data) {
				if(
					_this.utils.isPropExist(data,'query.results.data-series.series.p')
					&& _this.utils.isPropExist(data,'query.created')
				){
					var createUTCMs = _this.utils.queryToUTCMs(data.query.created);
					_this.createChart(data.query.results['data-series'].series.p,createUTCMs);
				}
			}
		);
	};
	chartProto.applySettings = function(){
		this.setCurrencies();
		this.setRefreshTime();
		this.setShowPeriodOnLoad();
	};
	// WORK WITH DOM
	chartProto.setCurrencies = function(curr1,curr2){
		curr1 = curr1 || (this.currSelect1 && this.currSelect1.options[this.currSelect1.selectedIndex].getAttribute("value")) || defaultOptions.currencies1;
		curr2 = curr2 || (this.currSelect2 && this.currSelect2.options[this.currSelect2.selectedIndex].getAttribute("value")) || defaultOptions.currencies2;
		var currString = curr1+curr2;
		this.url.urlGetPastData = chartProto.url.urlGetPastData.replace(/%7B%7Bcurrencies%7D%7D/gi,currString);
		this.url.urlGetNowData = chartProto.url.urlGetNowData.replace(/%7B%7Bcurrencies%7D%7D/gi,currString);
	};
	chartProto.setRefreshTime = function(timeInSec){
		timeInSec = timeInSec || (this.refreshTimeSelect && this.refreshTimeSelect.options[this.refreshTimeSelect.selectedIndex].getAttribute("value")) || defaultOptions.refreshTime;
		this.refreshTime = timeInSec*1000;
	};
	chartProto.setShowPeriodOnLoad = function(timeInMin){
		timeInMin = timeInMin || (this.showPeriodSelect && this.showPeriodSelect.options[this.showPeriodSelect.selectedIndex].getAttribute("value")) || defaultOptions.showPeriodOnLoad;
		if(timeInMin && timeInMin.split && timeInMin.split('*').length){
			timeInMin = timeInMin.split('*');
			var res = 1;
			for(var _i = timeInMin.length;_i--;){
				res *= timeInMin[_i];
			}
			timeInMin = res;// in ms
		}
		this.showPeriodOnLoad = timeInMin*60*1000;
	};
	// CHART
	Highcharts.setOptions({
		global: {
			useUTC: false
		}
	});
	chartProto.createChart=function(currencyArray,createTime){
		var _this = this;
		this.chart = new Highcharts.Chart({
			chart: {
				renderTo: _this.charContainer,
				type: 'spline',
				marginRight: 10,
				events: {
					load: function() {
						_this.setTimer();
					}
				}
			},
			title: {text: ''},
			xAxis: {
				type: 'datetime',
				tickPixelInterval: 150,
				minRange:1000
			},
			yAxis: {
				title: {text: ''},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			tooltip: {
				formatter: function() {
					return Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>'+
						Highcharts.numberFormat(this.y, 2);
				}
			},
			legend: {enabled: false},
			exporting: {enabled: false},
			series: [{
				name: 'Name',
				data: (function() {
					// common
					var data = [];
					var i = 0;
					var arrLength = currencyArray.length;
					// time indent between response generate time and last time inside json
					var lastCurrency = currencyArray[arrLength-1];
					var _lastCurrencyTime = Number(lastCurrency.ref)*1000;// to ms
					var timeIndent = createTime-_lastCurrencyTime;
					// options
					var increment = 1;
					var needCheckTime = true;
					if(
						(_lastCurrencyTime && (timeIndent > defaultOptions.maxExchTimeIndent) )
						&& timeIndent/1000/60/60/24<2)
					{// 2 day- The Exchange does not work on Saturdays and Sundays
						_this.utils.log("Exchanges don't work on weekends");
						increment = 10;
						needCheckTime = false;
					}
					// cycle
					for (;i<arrLength;i=i+increment) {
						var currCurrency = currencyArray[i];
						if(
							_this.utils.isPropExist(currCurrency,'ref')
							&& _this.utils.isPropExist(currCurrency,'v')
						){
							var _time = Number(currCurrency.ref)*1000;// to ms
							if(needCheckTime && _time<( createTime-_this.showPeriodOnLoad )){
								continue;
							}
							data.push({
								x: _time,
								y: Number(currCurrency.v[0])
							});
						}
					}
					// check
					if(!data.length){
						_this.utils.log("An unknown error occurred");
					}
					return data;
				})()
			}]
		});
	};
	// Expose CurrencyChart to the global object
	window.CurrencyChart = CurrencyChart;
}(window));