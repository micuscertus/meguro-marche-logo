var ol=document.getElementById('ol');
var logoL=0,logoT=0,logoW=0;
// 起動時にブラウザバーが消えた後の高さを固定して使う
var SW=0,SH=0;
var mediaStream=null;
var useFrontCamera=false;

function getSize(){
  // visualViewportが使えればそっちを使う（より正確）
  if(window.visualViewport){
    return {w:window.visualViewport.width, h:window.visualViewport.height};
  }
  return {w:window.innerWidth, h:window.innerHeight};
}

function stopStream(){
  if(mediaStream){
    mediaStream.getTracks().forEach(function(t){t.stop();});
    mediaStream=null;
  }
}

function attachStream(s){
  mediaStream=s;
  var v=document.getElementById('v');
  v.srcObject=s;
  v.play();
}

function startCam(){
  stopStream();
  var facing=useFrontCamera?'user':'environment';
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false})
  .then(function(s){
    attachStream(s);
    document.getElementById('ss').style.display='none';
    document.getElementById('cs').style.display='block';
    setTimeout(function(){
      var sz=getSize();
      SW=sz.w; SH=sz.h;
      applySliders();
    },600);
  })
  .catch(function(){alert('カメラを許可してください');});
}

function flipCamera(){
  if(document.getElementById('cs').style.display!=='block')return;
  var prev=useFrontCamera;
  useFrontCamera=!useFrontCamera;
  var facing=useFrontCamera?'user':'environment';
  stopStream();
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false})
  .then(function(s){
    attachStream(s);
    if(SW&&SH)applySliders();
    else setTimeout(function(){var z=getSize();SW=z.w;SH=z.h;applySliders();},400);
  })
  .catch(function(){
    useFrontCamera=prev;
    var f=useFrontCamera?'user':'environment';
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:f}},audio:false})
    .then(function(s){
      attachStream(s);
    })
    .catch(function(){});
    alert('カメラを切り替えできませんでした');
  });
}

function applySliders(){
  if(!SW||!SH)return;
  var sz=parseInt(document.getElementById('sz').value);
  var px=parseInt(document.getElementById('px').value);
  var py=parseInt(document.getElementById('py').value);
  logoW=SW*sz/100;
  var h=logoW*(ol.naturalHeight||1)/(ol.naturalWidth||1);
  logoL=SW*px/100-logoW/2;
  logoT=SH*py/100-h/2;
  logoL=Math.max(0,Math.min(SW-logoW,logoL));
  logoT=Math.max(0,Math.min(SH-h,logoT));
  setLogo(logoL,logoT,logoW);
}

function setLogo(x,y,w){
  ol.style.left=x+'px';
  ol.style.top=y+'px';
  ol.style.width=w+'px';
  ol.style.height='auto';
  logoL=x;logoT=y;logoW=w;
}

var cs=document.getElementById('cs');
var drag={on:false,sx:0,sy:0,ox:0,oy:0};
var pinch={on:false,d0:0,w0:0};

function tdist(t){
  var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;
  return Math.sqrt(dx*dx+dy*dy);
}

cs.addEventListener('touchstart',function(e){
  if(e.target.id==='sh'||e.target.tagName==='INPUT'||(e.target.closest&&(e.target.closest('#controls')||e.target.closest('#flipBtn'))))return;
  e.preventDefault();
  if(e.touches.length===1){
    drag.on=true;pinch.on=false;
    drag.sx=e.touches[0].clientX;drag.sy=e.touches[0].clientY;
    drag.ox=logoL;drag.oy=logoT;
  } else if(e.touches.length===2){
    drag.on=false;pinch.on=true;
    pinch.d0=tdist(e.touches);pinch.w0=logoW;
  }
},{passive:false});

cs.addEventListener('touchmove',function(e){
  if(e.target.tagName==='INPUT')return;
  e.preventDefault();
  if(e.touches.length===1&&drag.on){
    var nx=drag.ox+(e.touches[0].clientX-drag.sx);
    var ny=drag.oy+(e.touches[0].clientY-drag.sy);
    setLogo(Math.max(0,Math.min(SW-logoW,nx)),Math.max(0,Math.min(SH-ol.offsetHeight,ny)),logoW);
  } else if(e.touches.length===2&&pinch.on){
    var nw=Math.max(SW*0.1,Math.min(SW*0.95,pinch.w0*(tdist(e.touches)/pinch.d0)));
    var nh=nw*(ol.naturalHeight/ol.naturalWidth);
    var cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
    var cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
    setLogo(Math.max(0,Math.min(SW-nw,cx-nw/2)),Math.max(0,Math.min(SH-nh,cy-nh/2)),nw);
    document.getElementById('sz').value=Math.round(nw/SW*100);
  }
},{passive:false});

cs.addEventListener('touchend',function(){drag.on=false;pinch.on=false;});

function snap(){
  document.getElementById('fl').style.opacity='1';
  setTimeout(function(){document.getElementById('fl').style.opacity='0'},120);

  var v=document.getElementById('v'),c=document.getElementById('c');
  // 固定したサイズでキャンバス作成
  c.width=SW; c.height=SH;
  var ctx=c.getContext('2d');
  // object-fit:fillと同じ=引き伸ばし
  ctx.drawImage(v,0,0,SW,SH);

  var i=new Image();
  i.onload=function(){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=.95;
    ctx.drawImage(i,logoL,logoT,ol.offsetWidth,ol.offsetHeight);
    ctx.restore();
    done();
  };
  i.onerror=done;
  i.src=ol.src;
}

function done(){
  document.getElementById('ri').src=document.getElementById('c').toDataURL('image/jpeg',.95);
  document.getElementById('cs').style.display='none';
  var rs=document.getElementById('rs');
  var canShare=!!navigator.share;
  rs.classList.toggle('sharing',canShare);
  document.getElementById('hint').textContent=canShare
    ? '「共有する・保存する」で共有シートを開き、写真への保存やアプリへの共有を選べます。'
    : 'この環境では共有シートが使えません。写真を長押しして「写真に追加」などで保存してください。';
  rs.style.display='flex';
}
function shareResult(){
  if(!navigator.share)return;
  var c=document.getElementById('c');
  c.toBlob(function(blob){
    if(!blob)return;
    var file=new File([blob],'MEGURO-MARCHE.jpg',{type:'image/jpeg'});
    var data={files:[file],title:'MEGURO MARCHE',text:'MEGURO MARCHE'};
    if(navigator.canShare&&!navigator.canShare(data)){
      navigator.share({title:'MEGURO MARCHE',text:'MEGURO MARCHE'}).catch(function(e){
        if(e.name!=='AbortError')alert('共有できませんでした');
      });
      return;
    }
    navigator.share(data).catch(function(e){
      if(e.name!=='AbortError')alert('共有できませんでした');
    });
  },'image/jpeg',0.95);
}
function back(){
  document.getElementById('rs').style.display='none';
  document.getElementById('cs').style.display='block';
}