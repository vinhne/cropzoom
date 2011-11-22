/*
 * JQuery UI CropZoom v2
 * Release Date: April 17, 2010

 * Copyright (c) 2010 Gaston Robledo
 * Revisions 2011 by Jonathan Felchlin
 *
 * http://www.cropzoom.com.ar/
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, mochangeY, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Depends:
 *      jquery.ui.core.js
 *      jquery.ui.widget.js
 *      jquery.ui.draggable.js
 *      jquery.ui.resizable.js
 *      jquery.ui.slider.js
*/

(function( $ ) {
	$.widget( "jquery.cropzoom", {
		
		// defaults
		options: {
			top: 0,
			left: 0,
			width: 500,
			height: 375,
			matchImage: false,
			selector: {
				element: "",
				handles: "s,se,e",
				aspectRatio: false,
				centered: false,
				keepCentered: false,
				showPositionsOnDrag: true,
				showDimetionsOnDrag: true,
				maxHeight: null,
				maxWidth: null,
				minHeight: null,
				minWidth: null,
				hidden: false,
				startWithOverlay: false,
				hideOverlayOnDragAndResize: true,
				hideOverlay: false,
				hideInfo: false,
				locked: false,
				lockAspect: false,
				enablePassThroughBorder: false
			},
			image: {
				source: "",
				element: "",
				rotation: 0,
				width: 0,
				height: 0,
				top: 0,
				left: 0,
				minZoom: 10,
				maxZoom: 150,
				maxHeight: 600,
				maxWidth: 800,
				minHeight: 50,
				minWidth: 50,
				limitMaxSize: false,
				limitMinSize: false,
				useStartZoomAsMinZoom: false,
				snapToContainer: false,
				fillSelector: false,
				locked: true
			},
			enableOverlayImage: false,
			overlayImage: {
				imageSource: "",
				top: 0,
				left: 0,
				height: 0,
				width: 0,
				matchSelector: true
			},
			enableRotation: true,
			enableZoom: true,
			enableMovement: true,
			enableImageMatch: true,
			zoomSliderSteps: 1,
			rotationSteps: 5,
			movementSteps: 5,
			singleMovementSteps: 1,
			movementSpeed: 100,
			controls: {
				orientation: "vertical",
				zoomElement: "",
				zoomIncrement: 5,
				rotationIncrement: 90,
				rotationElement: "",
				movementElement: "",
				image_size_element: "",
				showMaxMin: true,
				showFit: true,
				showWidthAndHeightFit: false
			},
			selector_data: {},
			image_data: {},
			move_timeout: 500,		// Initial timeout for move
			move_steps: 1,
			tMovement: null
		},
		
		_create: function() {
			var instance = this
				o = this.options;
			o.original_options = $.extend({}, this.options);
		
			o.move_steps = o.singleMovementSteps;
			
			// Verify plugin dependencies
			if(!$.isFunction($.fn.draggable) || !$.isFunction($.fn.resizable) || !$.isFunction($.fn.slider)){
				alert("You must include ui.draggable, ui.resizable and ui.slider to use cropZoom");
				return;
			}
			if(o.enableRotation && undefined == $.cssHooks["transform"]){
				alert("You must include jQuery.transform for rotation control");
				return;
			}
			if(o.image.source == '' ||  o.image.width == 0 || o.image.height == 0){
				alert('You must set the source, width and height of the image element');
				return;
			}
			
			this.element.addClass("cz-main-window");
		},
		
		// Initialize the Plugin (called after _create and when re-initializing
		_init: function(){
			var o = this.options;
			this.element.empty();
			this._initImage();
			this._initSelector();
			this._initInfoBox();
			this._initOverlay();
			if(o.selector.startWithOverlay)
				this._setOverlayPositions();
				
			this._initZoomControl();
			if(o.enableRotation)
				this._initRotationControl();
			if(o.enableMovement)
				this._initMovementControls();
			if(o.enableImageMatch)
				this._initImageMatchControls();
				
			this._setImageContainment();
			
			this._limitBoundsToElement();
			this.adjustImage(o.image_data);
				
			this.element.css({
				'width': o.width,
				'height': o.height
			});
			// Fix for select cursor when dragging in Safari/Chrome
			o.image.element.each(function() { this.onSelectStart = function() { return false; }; });
		},
		
		// Public functions
		// ============================================================
		adjustImage: function(options){
			var o = this.options;
			
			if(undefined != options.height && undefined == options.width){
				options.match_dimension = "height";
				
			} else if(undefined != options.width && undefined == options.height){
				options.match_dimension = "width";
				
			} else if(options.match_element == "selector"){
				options.height = o.selector_data.height;
				options.width = o.selector_data.width;
				options.left = o.selector_data.left;
				options.top = o.selector_data.top;
				
			} else if(options.match_element == "container" && options.match_method == "contain"){
				if(o.image_data.width > o.width || o.image_data.height > o.height){
					options.height = o.height;
					options.width = o.width;
				} else {
					options.height = o.image_data.height;
					options.width = o.image_data.width;
					options.match_dimension = "none";
				}
				options.left = 0;
				options.top = 0;
				
			} else if(options.match_element == "container") {
				// match the container area
				options.height = o.height;
				options.width = o.width;
				options.left = 0;
				options.top = 0;
			}
			
			// set image to actual size
			if(options.match_method == "actual"){
				options.height = o.image.height;
				options.width = o.image.width;
				options.left = o.image_data.left + (o.image_data.width - o.image.width);
				options.top = o.image_data.top + (o.image_data.height - o.image.height);
				
			// image height and width is unchanged if it fits in the container
			} else if(options.match_method == "contain" 
			&& (o.image_data.width < options.width && o.image_data.height < options.height)){
				options.height = o.image_data.height;
				options.width = o.image_data.width;
				
			// Check for limiting dimension
			} else if(undefined == options.match_dimension 
			&& (options.match_method == "fit" || options.match_method == "fill" || options.match_method == "contain")){
				var is_width_larger = (options.width / options.height) * o.image.height < o.image.width;
				options.match_dimension = (options.match_method != "fill" && is_width_larger) || (options.match_method == "fill" && !is_width_larger)?"width":"height";
			}

			var old_height = o.image_data.height;
			var old_width = o.image_data.width;
			
			if(options.match_dimension == "width") {
				o.image_data.height = Math.round(o.image.height * (o.selector_data.width / o.image.width));
				o.image_data.width = options.width;
				o.image_data.left = options.left;
				if(undefined != options.center && options.center)
					o.image_data.top = options.top + Math.round((options.height - o.image_data.height) / 2);
				else
					o.image_data.top = o.image_data.top + ((old_height - o.image_data.height) / 2);
					
			} else if(options.match_dimension == "height") {
				o.image_data.width = Math.round(o.image.width * (options.height / o.image.height));
				o.image_data.height = options.height;
				o.image_data.top = options.top;
				if(undefined != options.center && options.center)
					o.image_data.left = options.left + Math.round((options.width - o.image_data.width) / 2);
				else
					o.image_data.left = o.image_data.left + ((old_width - o.image_data.width) / 2);
					
			} else if(undefined != options.height && undefined != options.width) {
				o.image_data.width = options.width;
				o.image_data.height = options.height;
				if(undefined != options.center && options.center) {
					o.image_data.left = options.left + Math.round((o.width - options.width) / 2);
					o.image_data.top = options.top + Math.round((o.height - options.height) / 2);
				} else if(undefined != options.left && undefined != options.top) {
					o.image_data.left = options.left;
					o.image_data.top = options.top;
				} else {
					o.image_data.left = o.image_data.left + ((old_width - o.image_data.width) / 2);
					o.image_data.top = o.image_data.top + ((old_height - o.image_data.height) / 2);
				}
			}
			// ensure the image is properly positioned to the match element
			if(options.match_method == "fill"){
				if(o.image_data.left + o.image_data.width < options.left + options.width)
					o.image_data.left = options.left - (o.image_data.width - options.width);
				else if(o.image_data.left > options.left)
					o.image_data.left = options.left;
					
				if(o.image_data.top + o.image_data.height < options.top + options.height)
					o.image_data.top = options.top - (o.image_data.height - options.height);
				else if(o.image_data.top > options.top)
					o.image_data.top = options.top;
			}
			
			this.resizeImage({height: o.image_data.height, width: o.image_data.width});
			o.image.element.css({ width: options.width + "px", height: options.height + "px" });
			
			if(undefined != options.top)
				o.image.element.css("top", o.image_data.top);
			if(undefined != options.left)
				o.image.element.css("left", o.image_data.left);
			
			if(undefined != o.$zoom_slider_selector){
				o.zoom = Math.round(100 * o.image_data.width / o.image.width);
				o.zoom = (o.controls.orientation == 'vertical' ? (o.image.maxZoom - o.zoom) : o.zoom);
				o.$zoom_slider_selector.slider("option", "value", o.zoom);
			}
			this._setImageContainment();
		},
		
		canZoomIn: function(){
			var o = this.options;
			
			return o.zoom > o.image.minZoom 
			&& (!o.image.fillSelector 
				|| (o.image_data.width > o.selector_data.width && o.image_data.height > o.selector_data.height))
			&& (!o.image.limitMaxSize || (o.image.maxHeight > o.image_data.height && o.image.maxWidth > o.selector_data.width));
		},
		canZoomOut: function(){
			return this.options.zoom < this.options.image.maxZoom
			&& (!o.image.limitMinSize || (o.image.minHeight < o.image_data.height && o.image.minWidth < o.selector_data.width));
		},
		
		lockSelector: function(){
			this.options.selector.element.draggable("disable");
			this.options.selector.element.find(".ui-resizable-handle").hide();
		},
		
		unlockSelector: function(){
			this.options.selector.element.draggable("enable");
			this.options.selector.element.find(".ui-resizable-handle").show();
		},
		
		//Function to set the selector position and sizes
		setSelector: function(options){
			var instance = this,
				o = this.options;
			
			if(undefined != options.match){
				switch(options.match){
					case "image":
						options.top = o.image_data.top;
						options.left = o.image_data.left;
						options.width = o.image_data.width;
						options.height = o.image_data.height;
						break;
					default:
						options.top = 0;
						options.left = 0;
						options.width = o.width;
						options.height = o.height;
				}
			}
			if(undefined != options.aspectHeight){
				if(o.image.fillSelector && options.aspectHeight * o.selector_data.width > o.image_data.height){
					options.height = Math.floor(o.image_data.height) - 2;
					options.width = options.height / options.aspectHeight;
				} else {
					options.width = o.selector_data.width;
					options.height = options.aspectHeight * o.selector_data.width;
				}
				options.left = o.selector_data.left + (o.selector_data.width - options.width) / 2;
				options.top = o.selector_data.top + (o.selector_data.height - options.height) / 2;
			}
			if(options.animate != undefined && options.animate == true){
				o.selector.element.animate({
					'top': options.top,
					'left': options.left,
					'width': options.width - 2,
					'height': options.height - 2
				}, 'slow');
			}else{
				o.selector.element.css({
					'top': options.top,
					'left': options.left,
					'width': options.width - 2,
					'height': options.height - 2
				});
			}
			o.selector_data.height = Math.floor(options.height);
			o.selector_data.width = Math.floor(options.width);
			o.selector_data.top = Math.floor(options.top);
			o.selector_data.left = Math.floor(options.left);
			this._setOverlayPositions();
			this._trigger("change", {}, instance.getSettings());
				
			this._setImageContainment();
		},
		
		resizeImage: function(options){
			var o = this.options;
			if(o.image.limitMaxSize && o.image.maxHeight < options.height){
				options.width = options.width * o.image.maxHeight / options.height;
				options.height = o.image.maxHeight;
			}
			if(o.image.limitMaxSize && o.image.maxWidth < options.width){
				options.height = options.height * o.image.maxWidth / options.width;
				options.width = o.image.maxWidth;
			}
			if(o.image.limitMinSize && o.image.minHeight > options.height){
				options.width = options.width * o.image.minHeight / options.height;
				options.height = o.image.minHeight;
			}
			if(o.image.limitMinSize && o.image.minWidth > options.width){
				options.height = options.height * o.image.minWidth / options.width;
				options.width = o.image.minWidth;
			}
			o.image_data.width = options.width;
			o.image_data.height = options.height;
			o.image.element.css({ 'width': options.width + "px", 'height': options.height + "px" });
			this._trigger("change", {}, this.getSettings());
		},

		// Update the image
		updateImage: function(options){
			this.options = $.extend({}, o.original_options);
			this.options.image.source = options.source;
			if(undefined != options.send_source)
				this.options.image.send_source = options.send_source;
			this.options.image.height = options.height;
			this.options.image.width = options.width;
			this.options.image_data = {};
			this.options.selector_data = {};
			this._init();
			this._trigger("change", {}, this.getSettings());
		},
		
		getSettings: function(){
			var o = this.options;
			return {
				image: {
					height: o.image.height,
					width: o.image.width,
					source: o.image.send_source || o.image.source
				},
				image_data: {
					height: o.image_data.height,
					width: o.image_data.width,
					top: o.image_data.top,
					left: o.image_data.left,
					rotate: o.image_data.rotation,
					start_zoom: undefined != o.zoom ? o.zoom : o.image.start_zoom
				},
				selector_data: {
					height: o.selector_data.height,
					width: o.selector_data.width,
					top: o.selector_data.top,
					left: o.selector_data.left
				}
			};
		},
		
		//Send the Data to the Server
		send: function(options){
			var instance = this,
				response = "";
			if(undefined == options.custom)
				options.custom = {};
			$.ajax({
				url : options.url,
				type: options.type,
				data: (this._getParameters(options.custom)),
				success:function(r){
					if(undefined != options.onSuccess)
						options.onSuccess(r);
					instance._trigger("success", {}, r);
				}
			});
		},
		
		_getCorrectSizes: function(){
			var o = this.options
			if(o.image_data.start_zoom != 0){
				o.image_data.width =  ((o.image.width * Math.abs(o.image_data.start_zoom)) / 100);
				o.image_data.height =  ((o.image.height * Math.abs(o.image_data.start_zoom)) / 100);
			}
			
			// Disable snap to container if the image is smaller
			if(o.image_data.width < o.width && o.image_data.height < o.height){
				o.image.snapToContainer = false;
			}
		},
	
		_getExtensionSource: function(){
			var parts = o.image.source.split('.');
			return parts[parts.length-1];	
		},
	
		_getParameters: function(custom){
			var o = this.options
			var fixed_data = {
				'viewPortW': o.width,
				'viewPortH': o.height,
				'imageX': o.image_data.left,
				'imageY': o.image_data.top,
				'imageRotate': o.image_data.rotation,
				'imageW': o.image_data.width,
				'imageH': o.image_data.height,
				'imageSource': o.image.send_source || o.image.source,
				'selectorX': o.selector_data.left,
				'selectorY': o.selector_data.top,
				'selectorW': o.selector_data.width,
				'selectorH': o.selector_data.height
			};
			return $.extend({}, fixed_data, custom);
		},
		
		_getPercentOfZoom: function(){
			var o = this.options
			var percent = 0;
			if(o.image_data.width > o.image_data.height){
				percent = o.image.maxZoom - ((o.image_data.width * 100) / o.image.width);
			}else{
				percent = o.image.maxZoom - ((o.image_data.height * 100) / o.image.height); 
			}
			return percent;
		},
	
		_hideOverlay: function(){
			this.element.find(".cz-overlay").hide();
		},
	
		_initImage: function(){
			var instance = this,
				o = this.options;
				
			o.image_data.start_zoom = o.image_data.start_zoom || o.image.start_zoom || 0;
			
			o.image_data = o.image_data || {};
			o.image_data = $.extend({}, {
				height: o.image.height,
				width: o.image.width,
				rotation: o.image.rotation,
				source: o.image.source,
				id: 'image_to_crop_' + this.element.attr("id")
			}, o.image_data);
			this._getCorrectSizes();
			
			o.image.element = $("<img />")
				.attr("src", o.image.source)
				.addClass("cz-image")
				.css({ position: "absolute", display: "block" });
			this.element.append(o.image.element);
			this.resizeImage(o.image_data);
			
			o.image_data.top = o.image_data.top || (o.height - o.image_data.height) / 2;
			o.image_data.left = o.image_data.left || (o.width - o.image_data.width) / 2;
			o.image.element.css({ top: o.image_data.top + "px", left: o.image_data.left + "px" });
				
			if(o.enableRotation && o.image_data.rotation != 0)
				o.image.element.css({transform: "rotate(" + o.image_data.rotation + "deg)"});
				
			var draggable_options = {
				drag: function(event,ui){ 
					o.image_data.top = ui.position.top;
					o.image_data.left = ui.position.left;
					instance._trigger("imageDrag", event, o.image.element);
				},
				stop: function(event, ui){
					instance._trigger("change", event, instance.getSettings());
				}
			};
			if(o.image.snapToContainer){
				draggable_options.containment = "parent";
			} else if(o.image.fillSelector){
				o.imageBounds = $("<div />").addClass("cz-image-bounds").css({"position": "absolute", "z-index": "-1000"});
				this.element.append(o.imageBounds);
				draggable_options.containment = undefined == this.element.attr("id")?"div.cz-image-bounds": "#"+this.element.attr("id") + " div.cz-image-bounds";
			}
			
			if(!o.image.locked)
				$(o.image.element).draggable(draggable_options);
				
			if(o.matchImage){
				o.width = o.image_data.width; o.height = o.image_data.height;
				o.image_data.top = 0; o.image_data.left = 0;
			}
			o.image_data.start_zoom = o.image_data.start_zoom || (o.image_data.width / o.image.width) * 100;
		},
	
		_initImageMatchControls: function(){
			var instance = this,
				o = this.options;
			
			var image_size_element = $("<div />");
			image_size_element.addClass("cz-image-size-controls");
			image_size_element.addClass("cropzoom-controls");
			
			var btns = [];
			btns.push($('<div />').addClass("crop_control_button zoom_fill_btn").click(function(event){
				event.preventDefault();
				instance.adjustImage({ match_element: "selector", match_method: "fill" });
			}));
			if(o.controls.showWidthAndHeightFit){
				btns.push($('<div />').addClass("crop_control_button zoom_fit_height_btn").click(function(event){
					event.preventDefault();
					instance.adjustImage({ match_element: "selector", match_dimension: "height" });
				}));
				btns.push($('<div />').addClass("crop_control_button zoom_fit_width_btn").click(function(event){
					event.preventDefault();
					instance.adjustImage({ match_element: "selector", match_dimension: "width" });
				}));
			} else if(o.controls.showFit) {
				btns.push($('<div />').addClass("crop_control_button zoom_fit_btn").click(function(event){
					event.preventDefault();
					instance.adjustImage({ match_element: "selector", match_method: "fit" });
				}));
			}
			
			for(var i=0; i<btns.length; i++){
				btns[i].mousedown(function(){
					instance._moveImage(this);			 
				}).mouseup(function(){
					clearTimeout(o.tMovement);
					o.move_timeout = 500;
				});
				image_size_element.append(btns[i]);
			}
			
			if(undefined != o.controls.image_size_element && o.controls.image_size_element != "")
				$(o.controls.image_size_element).append(image_size_element);
			else
				this.element.append(image_size_element);
		},
	
		_initInfoBox: function(){
			if(!this.options.selector.hideInfo){
				var _infoView = null,
					o = this.options;
				if(o.selector.element.find(".cz-info-view").length > 0){
					_infoView = o.selector.element.find(".cz-info-view");
				}else{
					_infoView = $('<div />').addClass("cz-info-view");
					o.selector.element.append(_infoView);
				}
				if(o.selector.showPositionsOnDrag){
					_infoView.html("X:"+ o.selector_data.left + "px - Y:" + o.selector_data.top + "px");
				}
				if(o.selector.showDimetionsOnDrag){
					if(_infoView.html() != ""){
						_infoView.html(_infoView.html() + " | W:" + o.selector_data.width + "px - H:" + o.selector_data.height + "px");
					}else{
						_infoView.html("W:"+ o.selector_data.width + "px - H:" + o.selector_data.height + "px");
					}
				}
			}
		},
		
		_initMovementControls: function(){
			var instance = this,
				o = this.options;
			
			var table = $('<table>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
			</table>');
			var btns = [];
			btns.push($('<div />').addClass('mvn_no mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_n mvn'));
			btns.push($('<div />').addClass('mvn_ne mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_o mvn'));
			btns.push($('<div />').addClass('mvn_c mvn'));
			btns.push($('<div />').addClass('mvn_e mvn'));
			btns.push($('<div />').addClass('mvn_so mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_s mvn'));
			btns.push($('<div />').addClass('mvn_se mvn mvn_corner'));
			
			for(var i=0;i<btns.length;i++){
				btns[i].mousedown(function(){
					instance._moveImage(this);			 
				}).mouseup(function(){
					clearTimeout(o.tMovement);
					o.move_timeout = 500;
					o.move_steps = o.singleMovementSteps;
				}).mouseout(function(event){
					if(o.tMovement != null)
						clearTimeout(o.tMovement);
					o.move_timeout = 500;
					o.move_steps = o.singleMovementSteps;
					instance._trigger("change", {}, instance.getSettings());
				});
				table.find('td:eq('+i+')').append(btns[i]);
			}
			var movement_element = $("<div />");
			movement_element.addClass("cz-movement");
			movement_element.addClass("cropzoom-controls");
			movement_element.append(table);
			
			if(o.controls.movementElement != "")
				$(o.controls.movementElement).append(movement_element);
			else
				this.element.append(movement_element);
		},
	
		_initOverlay: function(){
			var instance = this,
				o = this.options;
			
			var arr =['t cz-overlay', 'b cz-overlay', 'l cz-overlay', 'r cz-overlay'];
			if(this.options.selector.enablePassThroughBorder)
				arr.push('t-border overlay-border', 'b-border overlay-border', 'l-border overlay-border', 'r-border overlay-border');
			if(o.enableOverlayImage && o.overlayImage.imageSource != "")
				arr.push('t-image overlay-image', 'b-image overlay-image', 'l-image overlay-image', 'r-image overlay-image');
				
			$.each(arr,function(){
				var overlay = $("<div />").attr("class",this);
				instance.element.append(overlay);  
			});
			if(o.enableOverlayImage && o.overlayImage.imageSource != "")
				$(".overlay-image").css("background-image", o.overlayImage.imageSource);
		},
	
		_initRotationControl: function(){
			var instance = this,
				o = this.options;
	
			var rotationContainerSlider = $("<div />").addClass("cz-rotation-slider");
			rotationContainerSlider.addClass("cropzoom-controls");
	
			if(o.controls.showMaxMin){
				var rotMin = $("<div />").addClass("rotationMin").html("0");
				var rotMax = $("<div />").addClass("rotationMax").html("360");
			}
	
			var $slider = $("<div />").addClass("rotationSlider");
			//Aplicamos el Slider  
			var orientation = 'vertical';
			var value = Math.abs(360 - o.image.rotation);
	
	
			if(o.controls.orientation == 'horizontal' ){
				orientation = 'horizontal';
				value = o.image.rotation;
			}
	
			$slider.slider({
				orientation: orientation,  
				value: value,
				range:"max",
				min: 0,
				max: 360,
				step: ((o.rotationSteps > 360 || o.rotationSteps < 0) ? 1 : o.rotationSteps),
				slide: function(event, ui) {
					// TODO: image.fillSelector and image.snapToContainer
					o.image_data.rotation = (ui.value == 360 ? Math.abs(360 - ui.value) : Math.abs(ui.value));
					o.image.element.css({transform: "rotate(" + o.image_data.rotation + "deg)"});
					instance._trigger("imageRotate", event, o.image_data);
				},
				change: function(event, ui){
					instance._trigger("change", {}, instance.getSettings());
				}
			});
	
			if(o.controls.showMaxMin){
				rotationContainerSlider.append(rotMin);
				rotationContainerSlider.append($slider);
				rotationContainerSlider.append(rotMax);
			} else {
				rotationContainerSlider.append($slider);
			}
	
			$slider.addClass(o.controls.orientation);
			rotationContainerSlider.addClass(o.controls.orientation);
			if(o.controls.showMaxMin){
				rotMin.addClass(o.controls.orientation);
				rotMax.addClass(o.controls.orientation);
			}
			
			o.$rotation_slider_selector = $slider;
			if(o.controls.rotationElement != ''){
				$(o.controls.rotationElement).append(rotationContainerSlider);
			}else{
				this.element.append(rotationContainerSlider);
			}
		},
	
		_initSelector: function(){
			var instance = this,
				o = this.options;
			
			this.options.selector_data = this.options.selector_data || {};
			this.options.selector_data = $.extend({}, { left: o.selector.left, top: o.selector.top, width: o.selector.width, height: o.selector.height }, this.options.selector_data);
			var s = this.options.selector_data;
			
			s.width = s.width || Math.floor(o.image_data.width - 2);
			s.height = s.height || Math.floor(o.image_data.height - 2);
			s.width = (o.selector.maxWidth != null ? (s.width > o.selector.maxWidth ? o.selector.maxWidth : s.width) : s.width),
			s.height = (o.selector.maxHeight != null ? (s.height > o.selector.maxHeight ? o.selector.maxHeight : s.height) : s.height)
			var lock_aspect = o.selector.lockAspect ? o.selector.startAspect : false;
			if(undefined != o.selector.startAspect){
				if(s.width * o.selector.startAspect > s.height)
					s.width = s.height/o.selector.startAspect;
				else
					s.height = s.width * o.selector.startAspect;
			}
			
			if(undefined == s.top && o.selector.centered)
				s.top = Math.floor(o.image_data.top + (o.image_data.height/2) - (s.height/2));
			else
				s.top = s.top || 0;
			if(undefined == s.left && o.selector.centered)
				s.left = Math.floor(o.image_data.left + (o.image_data.width/2) - (s.width/2));
			else
				s.left = s.left || 0;
	
			o.selector.element = $('<div />').attr('id',this.element[0].id + '_selector').addClass("cz-selector")
				.css({ width: s.width - 2 + 'px', height: s.height - 2 + 'px', top: s.top + 'px', left: s.left + 'px'});
			
			o.selector.element.draggable({
				containment: 'parent',
				iframeFix: true,
				refreshPositions: true,
				start: function(event,ui){
					if(o.selector.hideOverlayOnDragAndResize && !o.selector.hideOverlay)
						instance._showOverlay();
				},
				drag: function(event,ui){
					s.left = ui.position.left;
					s.top = ui.position.top;
					instance._setOverlayPositions();
					instance._initInfoBox();
					instance._trigger("selectorDrag", event, instance.getSettings());
				},
				stop: function(event,ui){
					if(o.selector.hideOverlayOnDragAndResize)
						instance._hideOverlay();
					instance._trigger("selectorDragStop", event, instance.getSettings());
					instance._trigger("selectorChange", event, instance.getSettings());
					instance._trigger("change", event, instance.getSettings());
				}
			});
			
			o.selector.element.resizable({
				aspectRatio: o.selector.aspectRatio,
				maxHeight: o.selector.maxHeight, 
				maxWidth: o.selector.maxWidth,
				minHeight: o.selector.minHeight,
				minWidth: o.selector.minWidth,
				handles: o.selector.handles,
				containment: 'parent',
				aspectRatio: lock_aspect,
				start: function(event,ui){
					if(o.selector.hideOverlayOnDragAndResize && !o.selector.hideOverlay)
						instance._showOverlay();
				},
				resize: function(event,ui){
					/*
					if(o.selector.keepCentered){
						ui.position.left = ( ui.size.left - ui.originalPosition.left ) * 2 + ui.originalPosition.left;
						ui.position.top = ( ui.size.top - ui.originalPosition.top ) * 2 + ui.originalPosition.top;
						ui.size.width = ( ui.size.width - ui.originalSize.width ) * 2 + ui.originalSize.width;
						ui.size.height = ( ui.size.height - ui.originalSize.height ) * 2 + ui.originalSize.height;
					}*/
					s.height = ui.element.outerHeight(); s.width = ui.element.outerWidth();
					s.top = parseInt(ui.element.css("top")); s.left = parseInt(ui.element.css("left"));
					instance._setOverlayPositions();
					instance._initInfoBox();
					instance._trigger("selectorChange", event, instance.getSettings());
					instance._trigger("selectorResize", event, instance.getSettings());
				},
				stop:function(event,ui){
					if(o.selector.hideOverlayOnDragAndResize)
						instance._hideOverlay();
					var new_width = s.width * o.image.width / o.image_data.width;
					var new_height = s.height * o.image.height / o.image_data.height;
					instance._trigger("finalSizeChange", event, { height: new_height, width: new_width });
					instance._trigger("selectorResizeStop", event, instance.getSettings());
					instance._trigger("change", event, instance.getSettings());
				},
				change: function(event, ui){
					instance._trigger("selectorChange", event, instance.getSettings());
				}
			});	 
	
			this.element.append(o.selector.element);
			if(o.image.fillSelector){
				o.selector.element.draggable("option", "containment", o.image.element);
				//o.selector.element.resizable("option", "containment", o.image.element);
			}
			
			if(o.selector.hidden)
				o.selector.element.hide();
			if(o.selector.locked)
				this.lockSelector();
		},
	
		_initZoomControl: function(){
			var instance = this,
				o = this.options;
			
			o.zoomIncrement = o.controls.orientation == 'vertical' ? o.zoomIncrement * -1: o.zoomIncrement;
			if(o.enableZoom){
				var zoomContainerSlider = $("<div />").addClass("cz-zoom-slider cropzoom-controls");
		
				if(o.controls.showMaxMin){
					var zoomMin = $("<div />").addClass("zoomMin").html("<b>-</b>");
					var zoomMax = $("<div />").addClass("zoomMax").html("<b>+</b>");
				}
	
				var $slider = $("<div />").addClass("zoomSlider");
		
				$slider.slider({
					orientation: (o.controls.zoomElement != '' ? o.controls.orientation : 'vertical'),
					value: o.controls.orientation == 'vertical' ? o.image.maxZoom - Math.round(100 * o.image_data.width / o.image.width) : Math.round(100 * o.image_data.width / o.image.width),
					min: (o.image.useStartZoomAsMinZoom ? o.image_data.start_zoom : o.image.minZoom),
					max: o.image.maxZoom,
					step: ((o.zoomSliderSteps > o.image.maxZoom || o.zoomSliderSteps < 0) ? 1 : o.zoomSliderSteps),
					slide: function(event, ui) {
						instance._setZoom(ui.value);
					},
					stop: function(event, ui) {
						// fillSelector option correct zoom value
						instance._setOption("zoom", ui.value);
					},
					change: function(event, ui){
						// fillSelector option correct zoom value
						instance._trigger("imageChange", event, instance.getSettings());
					}
				});
		
				if(o.controls.showMaxMin){
					if(o.controls.orientation == 'vertical'){
						zoomContainerSlider.append(zoomMax).append($slider).append(zoomMin).addClass(o.controls.orientation);
					}else{
						zoomContainerSlider.append(zoomMin).append($slider).append(zoomMax).addClass(o.controls.orientation);
					}
					zoomMin.addClass(o.controls.orientation);
					zoomMax.addClass(o.controls.orientation);
				} else {
					zoomContainerSlider.append($slider);
				}
				$slider.addClass(o.controls.orientation); 
		
				o.$zoom_slider_selector = $slider;
				
				if(o.controls.zoomElement != ''){
					$(o.controls.zoomElement).empty();
					$(o.controls.zoomElement).append(zoomContainerSlider);
				}else{
					this.element.append(zoomContainerSlider);
				}
				this._setZoom(o.image_data.start_zoom);
			}
		},
	
		_limitBoundsToElement: function(){
			var o = this.options
			
			if(o.image.snapToContainer || o.image.fillSelector) {
				var element = o.image.snapToContainer?o:o.selector_data;
				
				var bottom = element.top-(o.image_data.height - element.height),
					right  = element.left-(o.image_data.width - element.width);
					
				if (o.image_data.top > element.top)
					o.image_data.top = element.top;
				else if (o.image_data.top < bottom)
					o.image_data.top = bottom;
					
				if (o.image_data.left > element.left)
					o.image_data.left = element.left;
				else if (o.image_data.left < right)
					o.image_data.left = right;
			}
		},
	
		_moveImage: function(obj){
			var instance = this,
				o = this.options,
				img = o.image_data;
	
			if($(obj).hasClass('mvn_no')){
				img.left = (img.left - o.move_steps);
				img.top = (img.top - o.move_steps);
			}else if($(obj).hasClass('mvn_n')){
				img.top = (img.top - o.move_steps);
			}else if($(obj).hasClass('mvn_ne')){
				img.left = (img.left + o.move_steps);
				img.top = (img.top - o.move_steps);
			}else if($(obj).hasClass('mvn_o')){
				img.left = (img.left - o.move_steps); 
			}else if($(obj).hasClass('mvn_c')){
				img.left = (o.width/2)-(img.width/2);
				img.top = (o.height/2)-(img.height/2);
			}else if($(obj).hasClass('mvn_e')){
				img.left = (img.left + o.move_steps);
			}else if($(obj).hasClass('mvn_so')){
				img.left = (img.left - o.move_steps);
				img.top = (img.top + o.move_steps);
			}else if($(obj).hasClass('mvn_s')){
				img.top = (img.top + o.move_steps);
			}else if($(obj).hasClass('mvn_se')){
				img.left = (img.left + o.move_steps);
				img.top = (img.top + o.move_steps);
			}
			
			this._limitBoundsToElement();
			o.image.element.css({top: o.image_data.top, left: o.image_data.left});
				
			o.tMovement = setTimeout(function(){
				instance._moveImage(obj);
			}, o.move_timeout);
			o.move_timeout = o.movementSpeed;
			o.move_steps = o.movementSteps;
		},
		
		_setImageContainment: function(){
			var o = this.options;
			
			if(o.image.fillSelector){
			
				o.imageBounds.css({
					height:
						o.image_data.height <= o.selector_data.height ?
							o.selector_data.height :
							Math.abs(2 * o.image_data.height - o.selector_data.height),
					width:
						o.image_data.width <= o.selector_data.width ?
							o.selector_data.width :
							Math.abs(2 * o.image_data.width - o.selector_data.width),
					top:
						o.image_data.height <= o.selector_data.height ?
							o.selector_data.top :
							o.selector_data.top - o.image_data.height + o.selector_data.height,
					left:
						o.image_data.width <= o.selector_data.width ?
							o.selector_data.left :
							o.selector_data.left - o.image_data.width + o.selector_data.width
				});
			}
		},
		
		_setOption: function(key, value) {
			var instance = this,
				o = this.options;
			switch(key){
				case "zoom":
					var new_zoom = 0;
					if(value == "in"){
						new_zoom = o.zoom + o.controls.zoomIncrement;
					} else if(value == "out") {
						new_zoom = o.zoom - o.controls.zoomIncrement;
					} else {
						new_zoom = parseInt(value);
					}
					
					this._setZoom(new_zoom);
					
					var final_zoom = (o.controls.orientation == 'vertical' ? (o.image.maxZoom - o.zoom) : o.zoom);
					if(o.zoom != new_zoom && undefined != o.$zoom_slider_selector)
						o.$zoom_slider_selector.slider("option", "value", final_zoom);
					break;
				case "rotate":
					if(value == "cw"){
						o.image_data.rotation = o.image_data.rotation + this.options.controls.rotationIncrement;
					} else if(value == "ccw") {
						o.image_data.rotation = o.image_data.rotation - this.options.controls.rotationIncrement;
					} else {
						o.image_data.rotation = parseInt(value);
					}
					
					while(o.image_data.rotation >= 360) o.image_data.rotation -= 360;
					while(o.image_data.rotation < 0) o.image_data.rotation += 360;
					o.image.element.css({transform: "rotate(" + o.image_data.rotation + "deg)"});
					instance._trigger("imageRotate", event, o.image_data);
					if(undefined != o.$rotation_slider_selector)
						o.$rotation_slider_selector.slider("option", "value", o.image_data.rotation);
					break;
				case "selectorAspectHeight":
					this.setSelector({ aspectHeight: value })
					break;
				case "selectorLockAspect":
					o.selector.element.resizable("option", "aspectRatio", value);
					break;
			}
		},
	
		_setOverlayPositions: function(){
			var o = this.options;
			
			if(!o.selector.hideOverlay)
				this._showOverlay();
			this.element.find("div.cz-overlay.t").css({
				width: o.width + "px",
				height: o.selector_data.top + "px",
				left: 0 + "px",
				top: 0 + "px"
			});
			this.element.find("div.cz-overlay.b").css({
				width: o.width + "px",
				height: o.height - (o.selector_data.top + o.selector_data.height) + "px",
				top: (o.selector_data.top + o.selector_data.height) + "px",
				left: 0 + "px"
			});
			this.element.find("div.cz-overlay.l").css({
				left: 0 + "px",
				top: o.selector_data.top + "px",
				width: o.selector_data.left + "px",
				height: o.selector_data.height + "px"
			});
			this.element.find("div.cz-overlay.r").css({
				top: o.selector_data.top + "px",
				left: (o.selector_data.left + o.selector_data.width) + "px",
				width: o.width - (o.selector_data.left + o.selector_data.width) + "px",
				height: o.selector_data.height + "px"
			});
			
			if(o.enableOverlayImage && o.overlayImage.imageSource != ""){
				if(o.overlayImage.matchSelector){
					o.overlayImage.top = o.selector_data.top;
					o.overlayImage.left = o.selector_data.left;
					o.overlayImage.height = o.selector_data.height;
					o.overlayImage.width = o.selector_data.width;
				}
				this.element.find("div.cz-overlay.t-image").css({
					width: o.width,
					height: this.overlayImage.top,
					left: 0,
					top:0,
					backgroundPosition: "0px 0px"
				});
				this.element.find("div.cz-overlay.b-image").css({
					width: o.width,
					height: o.height - (this.overlayImage.top + this.overlayImage.height),
					top: (this.overlayImage.top + this.overlayImage.height) + "px",
					left: 0,
					backgroundPosition: "0px " + (this.overlayImage.top + this.overlayImage.height) + "px"
				});
				this.element.find("div.cz-overlay.l-image").css({
					left: 0,
					top: this.overlayImage.top,
					width: this.overlayImage.left,
					height: this.overlayImage.height,
					backgroundPosition: "0px " + this.overlayImage.top + "px"
				});
				this.element.find("div.cz-overlay.r-image").css({
					top: this.overlayImage.top,
					left: (this.overlayImage.left + this.overlayImage.width) + "px",
					width: o.width - (this.overlayImage.left + this.overlayImage.width),
					height: this.overlayImage.height + "px",
					backgroundPosition: (this.overlayImage.left + this.overlayImage.width) + "px " + this.overlayImage.top + "px"
				});
			}
			
			if(o.selector.enablePassThroughBorder){
				this.element.find("div.cz-overlay.t-border").css({
					width: o.selector_data.width,
					height: o.selector_data.top,
					left: o.selector_data.left,
					top:0
				});
				this.element.find("div.cz-overlay.b-border").css({
					width: o.selector_data.width,
					height: o.height - (o.selector_data.top + o.selector_data.height),
					top: (o.selector_data.top + o.selector_data.height - 1) + "px",
					left: o.selector_data.left
				});
				this.element.find("div.cz-overlay.l-border").css({
					left: 0,
					top: o.selector_data.top,
					width: o.selector_data.left,
					height: o.selector_data.height
				});
				this.element.find("div.cz-overlay.r-border").css({
					top: o.selector_data.top,
					left: (o.selector_data.left + o.selector_data.width - 1) + "px",
					width: o.width - (o.selector_data.left + o.selector_data.width),
					height: o.selector_data.height + "px"
				});
			}
		},
		
		_setZoom: function(new_zoom){
			var o = this.options;
			var value = (o.controls.orientation == 'vertical' ? (o.image.maxZoom - new_zoom) : new_zoom),
				newWidth =  (o.image.width * Math.abs(value) / 100),
				newHeight =  (o.image.height * Math.abs(value) / 100);
			// constrain image size appropriately
			if(o.image.fillSelector && (newWidth < o.selector_data.width)){
				newWidth = o.selector_data.width;
				newHeight = o.image.height / o.image.width * o.selector_data.width;
			}
			if(o.image.fillSelector && (newWidth < o.selector_data.width || newHeight < o.selector_data.height)){
				newHeight = o.selector_data.height;
				newWidth = o.image.width / o.image.height * o.selector_data.height;
			}
			var changeX = (o.image_data.width - newWidth) / 2,
				changeY = (o.image_data.height - newHeight) / 2;
			// maintain image center
			o.image_data.left = (changeX > 0 ? o.image_data.left + Math.abs(changeX) : o.image_data.left - Math.abs(changeX)); 
			o.image_data.top = (changeY > 0 ? o.image_data.top + Math.abs(changeY) : o.image_data.top - Math.abs(changeY));
			// constrain image position appropriately
			if(o.image.fillSelector){
				o.image_data.left = o.image_data.left > o.selector_data.left? o.selector_data.left: o.image_data.left;
				o.image_data.left = o.image_data.left + newWidth < o.selector_data.left + o.selector_data.width? o.selector_data.left + o.selector_data.width - newWidth: o.image_data.left;
				o.image_data.top = o.image_data.top > o.selector_data.top? o.selector_data.top: o.image_data.top;
				o.image_data.top = o.image_data.top + newHeight < o.selector_data.top + o.selector_data.height? o.selector_data.top + o.selector_data.height - newHeight: o.image_data.top;
			}
			o.image_data.width = newWidth;
			o.image_data.height = newHeight;
			this.resizeImage(o.image_data);
			o.image.element.css({ top: o.image_data.top + "px", left: o.image_data.left + "px" });
			this._trigger("imageZoom", {}, o.image.element, o.image_data);
			o.zoom = Math.round(100 * o.image_data.width / o.image.width);
			this._setImageContainment();
		},
		
		_showOverlay: function(){
			this.element.find(".cz-overlay").show();
		}
	
	});
    var oldSetOption = $.ui.resizable.prototype._setOption;
    $.ui.resizable.prototype._setOption = function(key, value) {
        oldSetOption.apply(this, arguments);
        if (key === "aspectRatio") {
            this._aspectRatio = !!value;
        }
    };
})(jQuery);
