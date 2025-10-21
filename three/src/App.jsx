import { useState } from 'react'
import Animation0 from "./Versions/V0"
import Animation1 from "./Versions/V1"
import Animation2 from "./Versions/V2"
import Animation3 from "./Versions/V3"
import Animation4 from "./Versions/V4"
import Animation5 from "./Versions/V5"
import Animation6 from "./Versions/V6"
import Animation7 from "./Versions/V7"
import Animation8 from "./Versions/V8"
import Animation9 from "./Versions/V9"
import Animation10 from "./Versions/V10"

function App() {
  const [selectedAnimation, setSelectedAnimation] = useState('Animation0');

  
  const animations = {
    Animation0: Animation0,
    Animation1: Animation1,
    Animation2: Animation2,
    Animation3: Animation3,
    Animation4: Animation4,
    Animation5: Animation5,
    Animation6: Animation6,
    Animation7: Animation7,
    Animation8: Animation8,
    Animation9: Animation9,
    Animation10: Animation10,
  };

  
  const DeathVersion = () => (
    <div style={{ 
      width: '100vw',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: '#000'
    }}>
      {/* Animation containers stacked vertically */}
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation0
        </div>
        <Animation0 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation1
        </div>
        <Animation1 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation2
        </div>
        <Animation2 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation3
        </div>
        <Animation3 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation4
        </div>
        <Animation4 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation5
        </div>
        <Animation5 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation6
        </div>
        <Animation6 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation7
        </div>
        <Animation7 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation8
        </div>
        <Animation8 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative',
        borderBottom: '2px solid #333'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation9
        </div>
        <Animation9 />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
          Animation10
        </div>
        <Animation10 />
      </div>
    </div>
  );

  
  const CurrentAnimation = selectedAnimation === 'Death version' ? DeathVersion : animations[selectedAnimation];

  const handleAnimationChange = (event) => {
    setSelectedAnimation(event.target.value);
  };

  
  const animationOptions = [...Object.keys(animations), 'Death version'];

  return (
    <>
      {/* Animation Selector Dropdown */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <label style={{ 
          color: 'white', 
          marginRight: '10px',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
        }}>
          Select Animation:
        </label>
        <select 
          value={selectedAnimation} 
          onChange={handleAnimationChange}
          style={{
            backgroundColor: '#222',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            cursor: 'pointer'
          }}
        >
          {animationOptions.map((animationName) => (
            <option 
              key={animationName} 
              value={animationName}
              style={{
                color: animationName === 'Death version' ? '#ff6b6b' : 'white',
                fontWeight: animationName === 'Death version' ? 'bold' : 'normal'
              }}
            >
              {animationName}
            </option>
          ))}
        </select>
      </div>

      {/* Performance Warning for Death Version */}
      {selectedAnimation === 'Death version' && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          border: '2px solid #ff0000',
          maxWidth: '300px',
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif'
        }}>
          ⚠️ WARNING: Death Version renders ALL animations simultaneously. 
          This may cause severe performance issues and browser crashes!
        </div>
      )}

      {/* Render the selected animation */}
      <CurrentAnimation />
    </>
  )
}

export default App
