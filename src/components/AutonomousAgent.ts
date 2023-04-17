import type { Message } from "./ChatWindow";
import type { AxiosError } from "axios";
import axios from "axios";
import type { ModelSettings } from "../utils/types";
import {
  createAgent,
  executeAgent,
  startAgent,
} from "../services/agent-service";
import { DEFAULTAPIKEY } from "../utils/constants";

class AutonomousAgent {
  name: string;
  goal: string;
  tasks: string[] = [];
  completedTasks: string[] = [];
  modelSettings: ModelSettings;
  isRunning = true;
  renderMessage: (message: Message) => void;
  shutdown: () => void;
  numLoops = 0;

  constructor(
    name: string,
    goal: string,
    renderMessage: (message: Message) => void,
    shutdown: () => void,
    modelSettings: ModelSettings
  ) {
    this.name = name;
    this.goal = goal;
    this.renderMessage = renderMessage;
    this.shutdown = shutdown;
    this.modelSettings = modelSettings;
  }

  async run() {
    this.sendGoalMessage();
    this.sendThinkingMessage();

    // Initialize by getting tasks
    try {
      this.tasks = await this.getInitialTasks();
      for (const task of this.tasks) {
        await new Promise((r) => setTimeout(r, 800));
        this.sendTaskMessage(task);
      }
    } catch (e) {
      console.log(e);
      this.sendErrorMessage(getMessageFromError(e));
      this.shutdown();
      return;
    }

    await this.loop();
  }

  async loop() {
    console.log(`Loop ${this.numLoops}`);
    // console.log(this.tasks);

    if (!this.isRunning) {
      return;
    }

    if (this.tasks.length === 0) {
      this.sendCompletedMessage();
      this.shutdown();
      return;
    }

    this.numLoops += 1;
    const maxLoops = this.modelSettings.customApiKey === "" ? 4 : 50;
    console.log(`MaxLoops ${maxLoops}`);
    if (this.numLoops > maxLoops) {
      this.sendLoopMessage();
      this.shutdown();
      return;
    }

    // Wait before starting
    await new Promise((r) => setTimeout(r, 1000));

    // Execute first task
    // Get and remove first task
    this.completedTasks.push(this.tasks[0] || "");
    const currentTask = this.tasks.shift();
    this.sendThinkingMessage();

    const result = await this.executeTask(currentTask as string);
    this.sendExecutionMessage(currentTask as string, result);

    // Wait before adding tasks
    await new Promise((r) => setTimeout(r, 1000));
    this.sendThinkingMessage();

    // Add new tasks
    try {
      const newTasks = await this.getAdditionalTasks(
        currentTask as string,
        result
      );
      this.tasks = this.tasks.concat(newTasks);
      for (const task of newTasks) {
        await new Promise((r) => setTimeout(r, 800));
        this.sendTaskMessage(task);
      }

      if (newTasks.length == 0) {
        this.sendActionMessage("任務已完成！");
      }
    } catch (e) {
      console.log(e);
      this.sendErrorMessage(
        `添加額外任務時出現錯誤。可能違反了模型的策略。`
      );
      this.sendActionMessage("任務已完成！");
    }

    await this.loop();
  }

  async getInitialTasks(): Promise<string[]> {
    if (this.shouldRunClientSide()) {
      await testConnection(this.modelSettings);
      return await startAgent(this.modelSettings,this.name, this.goal);
    }else{
      var settings = {
        customApiKey: this.modelSettings.customApiKey == '' ? DEFAULTAPIKEY : this.modelSettings.customApiKey,
        customModelName: this.modelSettings.customModelName,
        customTemperature: this.modelSettings.customTemperature
      }
      return await startAgent(settings, this.name, this.goal);
    }
    // const res = await axios.post(`/api/chain`, {
    //   modelSettings:{
    //     customApiKey: this.modelSettings.customApiKey == '' ? DEFAULTAPIKEY : this.modelSettings.customApiKey,
    //     customModelName: this.modelSettings.customModelName,
    //     customTemperature: this.modelSettings.customTemperature
    //   },
    //   goal: this.goal,
    // });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    // return res.data.newTasks as string[];
  }

  async getAdditionalTasks(
    currentTask: string,
    result: string
  ): Promise<string[]> {
    if (this.shouldRunClientSide()) {
      return await createAgent(
        this.modelSettings,
        this.goal,
        this.tasks,
        currentTask,
        result,
        this.completedTasks
      );
    }else{
      var settings = {
        customApiKey: this.modelSettings.customApiKey == '' ? DEFAULTAPIKEY : this.modelSettings.customApiKey,
        customModelName: this.modelSettings.customModelName,
        customTemperature: this.modelSettings.customTemperature
      }
      return await createAgent(
        settings,
        this.goal,
        this.tasks,
        currentTask,
        result,
        this.completedTasks
      );
    }

    // const res = await axios.post(`/api/create`, {
    //   modelSettings: this.modelSettings,
    //   goal: this.goal,
    //   tasks: this.tasks,
    //   lastTask: currentTask,
    //   result: result,
    //   completedTasks: this.completedTasks,
    // });
    // // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    // return res.data.newTasks as string[];
  }

  async executeTask(task: string): Promise<string> {
    if (this.shouldRunClientSide()) {
      return await executeAgent(this.modelSettings,this.name, this.goal, task);
    }else{
      var settings = {
        customApiKey: this.modelSettings.customApiKey == '' ? DEFAULTAPIKEY : this.modelSettings.customApiKey,
        customModelName: this.modelSettings.customModelName,
        customTemperature: this.modelSettings.customTemperature
      }
      return await executeAgent(settings, this.name, this.goal, task);

    }

    // const res = await axios.post(`/api/execute`, {
    //   modelSettings: this.modelSettings,
    //   goal: this.goal,
    //   task: task,
    // });
    // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    // return res.data.response as string;
  }

  private shouldRunClientSide() {
    return this.modelSettings.customApiKey != "";
  }

  stopAgent() {
    this.sendManualShutdownMessage();
    this.isRunning = false;
    this.shutdown();
    return;
  }

  sendMessage(message: Message) {
    if (this.isRunning) {
      this.renderMessage(message);
    }
  }

  sendGoalMessage() {
    this.sendMessage({ type: "goal", value: this.goal });
  }

  sendLoopMessage() {
    this.sendMessage({
      type: "system",
      value:
        this.modelSettings.customApiKey !== ""
          ? `此程式已經運行太久了（50個循環）。為了節省您的荷包..，此程式將暫時關閉。`
          : "非常抱歉，因為這是演示，我們不能讓程式運行太長時間。如果您需要更長的運行時間，請在設置中提供您自己的API金鑰。現在關閉程式。",
    });
  }

  sendManualShutdownMessage() {
    this.sendMessage({
      type: "system",
      value: `AI程式已被手動關閉。`,
    });
  }

  sendCompletedMessage() {
    this.sendMessage({
      type: "system",
      value: "所有任務已完成，正在關閉中。",
    });
  }

  sendThinkingMessage() {
    this.sendMessage({ type: "thinking", value: "" });
  }

  sendTaskMessage(task: string) {
    // console.log('sendTaskMessage:',task)
    // var _this = this
    // let obj = {
    //   system: '你是一個語言高手',
    //   user: '翻譯成繁體中文，語意也修正為台灣常用:\n' + task
    // }
    // let url = 'https://fastv.tw/mygpt/sql/'
    // axios.post(url, obj)
    //   .then(function (response) {
    //     console.log(response.data.choices[0].message.content);
    //     _this.sendMessage({ type: "task", value: response.data.choices[0].message.content });
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //   });

    this.sendMessage({ type: "task", value: task });
  }

  sendErrorMessage(error: string) {
    this.sendMessage({ type: "system", value: error });
  }

  sendExecutionMessage(task: string, execution: string) {
    this.sendMessage({
      type: "action",
      info: `Executing "${task}"`,
      value: execution,
    });
  }

  sendActionMessage(message: string) {
    this.sendMessage({
      type: "action",
      info: message,
      value: "",
    });
  }
}

const testConnection = async (modelSettings: ModelSettings) => {
  // A dummy connection to see if the key is valid
  // Can't use LangChain / OpenAI libraries to test because they have retries in place
  return await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: modelSettings.customModelName,
      messages: [{ role: "user", content: "Say this is a test" }],
      max_tokens: 7,
      temperature: 0,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelSettings.customApiKey == '' ? DEFAULTAPIKEY : modelSettings.customApiKey}`,
      },
    }
  );
};

const getMessageFromError = (e: unknown) => {
  let message =
    "ERROR accessing OpenAI APIs. Please check your API key or try again later";
  if (axios.isAxiosError(e)) {
    const axiosError = e as AxiosError;
    if (axiosError.response?.status === 429) {
      message = `ERROR using your OpenAI API key. You've exceeded your current quota, please check your plan and billing details.`;
    }
    if (axiosError.response?.status === 404) {
      message = `ERROR your API key does not have GPT-4 access. You must first join OpenAI's wait-list.`;
    }
  } else {
    message = `ERROR retrieving initial tasks array. Retry, make your goal more clear, or revise your goal such that it is within our model's policies to run. Shutting Down.`;
  }
  return message;
};

export default AutonomousAgent;
