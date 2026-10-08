            this.softAcc=0;
            break;
          }
        }
      }
      this.gravityAcc=0;
    }else if(this.rules.gravity===0){
      // 20G: settle vertically immediately. This is automatic gravity,
      // never a finesse input, and lock delay still owns floor timing.
      this.softAcc=0;
      this.gravityAcc=0;
      while(this.movePiece(0,1)){}
    }else if(this.rules.gravity!==Infinity){
      this.softAcc=0;
      this.gravityAcc+=dt;
      while(this.gravityAcc>=this.rules.gravity){
        this.gravityAcc-=this.rules.gravity;
        if(!this.movePiece(0,1))break;
      }
    }
    // Soft drop never suppresses horizontal handling. TETR.IO keeps
    // left/right DAS/ARR active while soft drop is held, including during
    // lock delay after the piece reaches the floor.
    if(this.finesseEnabled&&this.finesseActions.length){
      const expected=this.finesseActions[this.finesseProgress];
      if(expected&&typeof expected==='object'&&expected.mode==='das'&&
         (expected.action==='left'||expected.action==='right')){