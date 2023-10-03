import { useState, useEffect } from "react"
import { NFTStorage, File } from "nft.storage"
import { Buffer } from "buffer"
import { ethers } from "ethers"
import axios from "axios"

// Components
import Navigation from "./components/Navigation"

// ABIs
import NFT from "./abis/NFT.json"

// Config
import config from "./config.json"

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [name, setName] = useState(null)
  const [description, setDescription] = useState(null)
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)
  const [nft, setNFT] = useState(null)

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()
    
    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)

    const name = await nft.name()
    console.log("name", name)
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if (name == null || description == null) {
      window.alert("Please provide a name and description")
      return
    }

    const imageData = await createImage()

    const url  = await uploadImage(imageData)
    
    await mintImage(url)

  }

  const createImage = async () => {

    console.log("Generating image...")
    
    const URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2"

    const response = await axios({
      url: URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        inputs: description,
        options: { wait_for_model: true }
      }),
      responseType: 'arraybuffer'
    })

    const type = response.headers['content-type']
    const data = response.data

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data
    setImage(img)

    return data

  }

  const uploadImage = async (imageData) => {
    console.log('Uploading Image...')

    const nftStorage = new NFTStorage({
      token: process.env.REACT_APP_NFT_STORAGE_API_KEY
    })

    const { ipnft } = await nftStorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name,
      description
    })

    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setUrl(url)

    return url
  }

  const mintImage = async (tokenURI) => {
    console.log("Waiting for mint...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, {
      value: ethers.utils.parseUnits("1", "ether")
    })

    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className="form">
        <form onSubmit={submitHandler}>
          <input onChange={(e) => setName(e.target.value)} type="text" placeholder="Create a name..." />
          <input onChange={(e) => setDescription(e.target.value)} type="text" placeholder="Create a description...." />
          <input type="submit" value="Create & Mint" />
        </form>
        <div className="image">
          <img src={image} alt="AI generated Image" />
        </div>

        <p>View<a href={url} target="_blank" rel="noreferrer">Metadata</a></p>
      </div>
    </div>
  )
}

export default App
