import React from "react";
import Button from "./Button";
import {
  FaKey,
  FaMicrochip,
  FaThermometerFull,
  FaExclamationCircle,
} from "react-icons/fa";
import Dialog from "./Dialog";
import Input from "./Input";
import { GPT_MODEL_NAMES, GPT_4 } from "../utils/constants";
import Accordion from "./Accordion";

export default function SettingsDialog({
  show,
  close,
  customApiKey,
  setCustomApiKey,
  customModelName,
  setCustomModelName,
  customTemperature,
  setCustomTemperature,
}: {
  show: boolean;
  close: () => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  customModelName: string;
  setCustomModelName: (key: string) => void;
  customTemperature: number;
  setCustomTemperature: (temperature: number) => void;
}) {
  const [key, setKey] = React.useState<string>(customApiKey);

  const handleClose = () => {
    setKey(customApiKey);
    close();
  };

  const handleSave = () => {
    setCustomApiKey(key);
    close();
  };

  const advancedSettings = (
    <Input
      left={
        <>
          <FaThermometerFull />
          <span className="ml-2">Temp: </span>
        </>
      }
      value={customTemperature}
      onChange={(e) => setCustomTemperature(parseFloat(e.target.value))}
      type="range"
      toolTipProperties={{
        message: "Higher temperature will make output more random",
        disabled: false,
      }}
      attributes={{
        min: 0,
        max: 1,
        step: 0.01,
      }}
    />
  );

  return (
    <Dialog
      header="Settings ⚙"
      isShown={show}
      close={handleClose}
      footerButton={<Button onClick={handleSave}>存檔</Button>}
    >
      <p>
        您可以在這裡加入您的OpenAI API金鑰。這將需要您支付自己的OpenAI使用費用，但能夠提供AgentGPT更大的訪問權限！此外，您也可以選擇OpenAI提供的任何模型。
      </p>
      <br />
      <p
        className={
          customModelName === GPT_4
            ? "rounded-md border-[2px] border-white/10 bg-yellow-300 text-black"
            : ""
        }
      >
        <FaExclamationCircle className="inline-block" />
        &nbsp;
        <b>
          若要使用GPT-4模型，您需要提供GPT-4的API金鑰。您可以向OpenAI申請獲取。&nbsp;
          <a
            href="https://openai.com/waitlist/gpt-4-api"
            className="text-blue-500"
          >
            點這邊申請
          </a>
          .
        </b>
      </p>
      <br />
      <div className="text-md relative flex-auto p-2 leading-relaxed">
        <Input
          left={
            <>
              <FaMicrochip />
              <span className="ml-2">Model:</span>
            </>
          }
          type="combobox"
          value={customModelName}
          onChange={() => null}
          setValue={setCustomModelName}
          attributes={{ options: GPT_MODEL_NAMES }}
        />
        <br className="hidden md:inline" />
        <Input
          left={
            <>
              <FaKey />
              <span className="ml-2">Key: </span>
            </>
          }
          placeholder={"sk-..."}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <br className="md:inline" />
        <Accordion
          child={advancedSettings}
          name="Advanced Settings"
        ></Accordion>
        <br />
        <strong className="mt-10">
          注意: 要獲取金鑰，請註冊OpenAI帳戶並前往此
          <a
            href="https://platform.openai.com/account/api-keys"
            className="text-blue-500"
          >
            網址
          </a>
          <br />
          這個金鑰僅會在目前的session中有效，關閉瀏覽器後就會清除。
        </strong>
      </div>
    </Dialog>
  );
}
