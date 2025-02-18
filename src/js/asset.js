/*
This software is released under the BSD-3-Clause License

Copyright 2025 Daydream Interactive Limited

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Page globals
var id = getParameterByName("id","");
var sessiontoken = localStorage.sessiontoken;

// Check session token on page load and redirect to login if a valid one isn't found
$(document).ready(function(){
	checkSessionToken().then(
		function(data){
			if (data.error){
				window.location.href = "/";
			} else {
				init(data);
			}
		}
	).fail(function(){
		window.location.href = "/";
	});
});


function init(userdata) {

	$(".logged-in").show();
	$(".main-container").fadeIn();
	
	// Append logout link with sessiontoken
	$(".logout").attr("href","/api/user/logout/?sessiontoken="+userdata.data.sessiontoken);
	
	if (id == ""){
		showError("No asset ID was provided",true);
	} else {
		getAsset();
	}
	
	if (userdata.data.userroleid == 2){
		$(".isadmin").show();
	}
	
	$(function(){
      $(".footer").load("/html/footer.html"); 
    });
	
	// Check if input URL is valid in add asset form
	$(document).on("keyup","#update-url",function(){
		$(this).removeClass('json-bad');
		var addurl = $(this).val();
		if (addurl == ""){
			return;
		}
		if (addurl != "" && !isValidUrl(addurl)){
			$(this).addClass('json-bad');
		} else {
			$(this).removeClass('json-bad');
		}
	});
	
	// JSON validation
	$(document).on("keyup focus","#update-metadata",function(){
		var json = $(this).val();
		var popover = $(this).data('bs.popover');
		$(this).removeClass('json-bad');
		if (json == ""){
			$(this).popover('hide');
			return;
		} else if (isJsonString(json)){
			$(this).removeClass('json-bad');
			if (popover){	
				popover.options.content = "JSON is Valid";	
			} else {
				$(this).popover({content:"JSON is Valid",trigger:"manual",placement:"bottom"});
			}
		} else {
			$(this).addClass('json-bad');
			if (popover){
				popover.options.content = "JSON is NOT Valid";
			} else {
				$(this).popover({content:"JSON is NOT Valid",trigger:"manual",placement:"bottom"});
			}
		}	
		$(this).popover('show');
	});
	
	$(document).on("blur","#update-metadata",function(){
		var el = $(this).popover('hide');
	});
	
	$(document).on("click",".popover",function(){
		$(this).popover('hide');
	});
	
	$(document).on("click",".assetDelete",function(){
		var answer = confirm("This will delete the asset. Are you sure?");
		if (answer){
			deleteAsset();
		}
		return false;
	});

	$(document).on("click",".btn-add-reset",function(){
		$("#update-file, #update-url").val("");
		return false;
	});
	
	// Zoom/Preview function
	$(".assetPreview").on({
		mouseenter: function () {
			var $this = $(this);
			// Stuff to do on mouse enter
			var mimetype = $this.attr("data-mimetype");
			var extension = $this.attr("data-extension");
			var type = "image"; // default
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			// If asset can be embedded, show the full size one
			if (type == "image" && in_array(extension,embedtypes)){
				$(".assetPreview img").show();
				$(".assetPreview img").attr("src",$this.attr("data-embedurl"));
				$(".assetPreview img").css("max-width",$this.attr("data-fullwidth")+"px");
				$(".assetPreview img").css("max-height",$this.attr("data-fullheight")+"px");
			}
			return false;
		},
		mouseleave: function () {
			var $this = $(this);
			// Stuff to do on mouse enter
			var mimetype = $this.attr("data-mimetype");
			var extension = $this.attr("data-extension");
			var type = "image";
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			// Stuff to do on mouse leave	
			if (type == "image" && in_array(extension,embedtypes)){
				$(".assetPreview img").attr("src",$this.attr("data-previewurl"));	
				$(".assetPreview img").css("max-width",$this.attr("data-previewwidth")+"px");
				$(".assetPreview img").css("max-height",$this.attr("data-previewheight")+"px");
				$(".assetPreview img").css("margin-left",0);
				$(".assetPreview img").css("margin-top",0);
				$(".assetPreview img").show();
			}
			return false;
		},
		mousemove: function (e) {
			var $this = $(this);
			var url = $this.attr("data-embedurl");	
			var mimetype = $this.attr("data-mimetype");
			var extension = $this.attr("data-extension");
			var type = "image";
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			// Stuff to do on mouse move
			if (type == "image" && in_array(extension,embedtypes)){
				var parentOffset = $this.parent().offset();
				var relX = Math.round(e.pageX - parentOffset.left,0);
				var relY = Math.round(e.pageY - parentOffset.top,0);
				
				var fw = $this.attr("data-fullwidth");
				var fh = $this.attr("data-fullheight");
				var w = $this.attr("data-previewwidth");
				var h = $this.attr("data-previewheight");
	
				$(".assetPreview img").css("margin-left",( (relX + 60) - (fw/350) * relX) );
				$(".assetPreview img").css("margin-top",( relY - (fh/350) * relY) );
			}			
			return false;
		}
	});

}

function deleteAsset(){
	
	$.ajax({
			type: "POST",
			url: "/api/asset/delete",
			data: {sessiontoken:sessiontoken,id:id},
			dataType: "json",
			encode: true,
		}).done(function (data) {
			if (data.error){
				showError(data.description);
			} else {
				showSuccess('The asset was successfully deleted. <a href="/view">Return to assets</a>.',true);
			}
		}).fail(function( jqxhr, textStatus, error ) {
			var err = error;
			showError(err);
		});
}

function getAsset(){

	$(".errors").hide();

	$.getJSON("/api/asset/get/",{sessiontoken:sessiontoken,id:id})
	.done(function(json) {
		if (json.error){
			showError(json.description,true);
		} else {
			$(".asset-container").show();
			var asset = json.data;
			asset.filesize = formatBytes(asset.metadata.filesize);	
			var extension = asset.metadata.extension;
			if (in_array(extension,previewtypes)){
				var previewurl = "/api/asset/preview/?sessiontoken="+sessiontoken+"&id="+asset.assetid;
			} else {
				var previewurl = "/images/no-preview.png";
			}
			var embedurl = "/api/asset/embed/?sessiontoken="+sessiontoken+"&id="+asset.assetid;			
			
			// Data fields			
			for (i in asset){
				$("span[data-field='"+i+"'],div[data-field='"+i+"']").html(asset[i]);
			}
			for (i in asset.metadata){
				$("span[data-field='"+i+"'],div[data-field='"+i+"']").html(asset.metadata[i]);
			}
			
			// If metadata-only asset, show filename as 'none' instead of null
			if (asset.metadata.filename == null){
				$("*[data-field='filename']").html("No File");
				$("*[data-field='mimetype']").html("N/A");
			}
			if (asset.metadata.fullwidth == null || asset.metadata.fullheight == null){
				$(".tr-dimensions").hide();
			}
			
			$("*[data-field='description']").html(asset.metadata.extensions.simpledam.description);
			
			$("*[data-field='views']").html(asset.metadata.extensions.simpledam.views);
			
			$("*[data-field='downloads']").html(asset.metadata.extensions.simpledam.downloads);
			
			$("*[data-field='uploader']").html(asset.metadata.extensions.simpledam.uploader);
			
			$("div[data-field='metadata']").html("<pre>" + JSON.stringify(asset.metadata,null,2) + "</pre>");
			
			$(".sessiontoken").val(sessiontoken);
			
			$(".assetDownloadLink").attr("href","/api/asset/download/?sessiontoken="+sessiontoken+"&id="+asset.assetid);
			$(".assetUpdate").attr("href","/admin/edit/?id="+asset.assetid);
			
			var mimetype = asset.metadata.mimetype;
			var type = "image";
			if (mimetype){
				type = mimetype.split("/")[0];
			}
			
			$(".assetPreview").attr("data-mimetype",asset.metadata.mimetype);
			$(".assetPreview").attr("data-embedurl",embedurl);
			$(".assetPreview").attr("data-extension",extension);
			$(".assetPreview").attr("data-previewurl",previewurl);
			$(".assetPreview").attr("data-previewwidth",asset.metadata.previewwidth);
			$(".assetPreview").attr("data-previewheight",asset.metadata.previewheight);
			$(".assetPreview").attr("data-fullwidth",asset.metadata.fullwidth);
			$(".assetPreview").attr("data-fullheight",asset.metadata.fullheight);
			
			if (type == "image" && extension !== null){
				if (extension != "ai" && extension != "pdf" && extension != "psd"){
					$(".assetZoomHint").show();
					$(".assetPreview").html('<a class="asset-embed" title="View full-screen" data-toggle="modal" data-target="#fullscreenModal" href="#"><img src="'+previewurl+'" /></a>');
					$(".assetEmbed").html('<a data-dismiss="modal" title="Click to close" href="#"><img src="'+embedurl+'" /></a>');
				} else {
					$(".assetPreview").html('<img src="'+previewurl+'" />');
				}
				$(".tr-dimensions").show();
			} else {
				$(".assetPreview").html('<img src="'+previewurl+'" />')
			}

			if (type == "audio"){
				$(".assetPreview").html('<audio width="350" height="262" id="audio-player" controls="controls" src="'+embedurl+'" type="'+mimetype+'">');
				$(".assetPreview").css("background-image","none");
			}
			if (type == "video"){
				$(".assetPreview").html('<video width="350" height="262" id="video-player" controls="controls" src="'+embedurl+'" type="'+mimetype+'">');
				$(".assetPreview").css("background-image","none");
			}
			
		}
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError("The asset could not be retrieved at this time. Please try again later.",true);
	}); // end getJSON
}