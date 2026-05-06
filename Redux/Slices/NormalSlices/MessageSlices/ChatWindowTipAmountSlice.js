import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../../Actions';

//This was required because previously setting states via props was not working basically the chat component were not rerendering and hence the conversation Id was not changing

const initialState = {
    data: {
        amount: 10,
    },

};

const chatWindowTipAmount = createSlice({
    name: 'chatWindowTipAmount',
    initialState,
    reducers: {
        increaseTipAmount: (state, action) => {
            state.data.amount = state.data.amount < 10 ? 10 : Number(state.data.amount) + 1
        },

        decreaseTipAmount: (state, action) => {
           if(state.data.amount > 10) {
              state.data.amount = Number(state.data.amount) - 1;
           } else {
              state.data.amount = 0;
           }
        },
        customTipAmount: (state, action) => {
            if(action.payload.amount >= 0) {
                
                state.data.amount = Number(action.payload.amount);
            } else {
                console.log("Amount is less than zero")
            }
        }
    },
    extraReducers(builder) {
        builder.addCase(resetAll, (state) => {
          return initialState
        })
      }
});

export const { increaseTipAmount, decreaseTipAmount, customTipAmount } = chatWindowTipAmount.actions;
export default chatWindowTipAmount.reducer;
